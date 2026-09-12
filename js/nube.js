/* =========================================================
   nube.js — login con Google y guardado en Firestore
   Expone: window.BM.nube

   Auth usa el SDK de Firebase (popup de Google, renovar el token).
   Firestore se habla por REST: el SDK pesa medio mega y acá alcanza
   con leer y escribir documentos enteros.

   Estructura en Firestore (las reglas solo dejan entrar al dueño):
     usuarios/{uid}              { json: "{version, config}" }
     usuarios/{uid}/meses/{id}   { json: "{...el mes...}" }
   ========================================================= */
(function (global) {
  "use strict";

  var BM = global.BM;
  var config = BM.firebaseConfig;
  var http = global.location && /^https?:$/.test(global.location.protocol);

  var nube = {
    /* hay proyecto configurado y se sirve por http(s): la app pide login */
    configurada: !!(config && config.apiKey && http),
    /* además cargó el SDK (sin conexión y sin cache puede no estar) */
    disponible: !!(config && config.apiKey && http && global.firebase && global.firebase.auth),
    usuario: null
  };

  var auth = null;
  /* lo último que sabemos que está en la nube, por documento: evita subir lo que no cambió */
  var subido = {};

  function base() {
    return "projects/" + config.projectId + "/databases/(default)/documents";
  }
  function url(ruta) {
    return "https://firestore.googleapis.com/v1/" + ruta;
  }

  function pedir(metodo, ruta, cuerpo) {
    if (!nube.usuario) return Promise.reject(new Error("Sin sesión"));
    return nube.usuario.getIdToken().then(function (token) {
      return fetch(url(ruta), {
        method: metodo,
        headers: { "Authorization": "Bearer " + token, "Content-Type": "application/json" },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined
      });
    }).then(function (res) {
      if (res.status === 404) return null;
      return res.json().then(function (datos) {
        if (!res.ok) throw new Error((datos.error && datos.error.message) || ("Error " + res.status));
        return datos;
      });
    });
  }

  function docsDeEstado(estado) {
    var uid = nube.usuario.uid;
    var docs = {};
    docs["usuarios/" + uid] = JSON.stringify({ version: estado.version, config: estado.config });
    Object.keys(estado.meses).forEach(function (id) {
      docs["usuarios/" + uid + "/meses/" + id] = JSON.stringify(estado.meses[id]);
    });
    return docs;
  }

  /* Trae todo lo del usuario. null si todavía no guardó nada. */
  nube.bajar = function () {
    var uid = nube.usuario.uid;
    return pedir("GET", base() + "/usuarios/" + uid).then(function (raiz) {
      if (!raiz) { subido = {}; return null; }
      var docs = {};
      docs["usuarios/" + uid] = raiz.fields.json.stringValue;
      var estado = JSON.parse(docs["usuarios/" + uid]);
      estado.meses = {};

      function pagina(token) {
        var ruta = base() + "/usuarios/" + uid + "/meses?pageSize=300" + (token ? "&pageToken=" + encodeURIComponent(token) : "");
        return pedir("GET", ruta).then(function (res) {
          ((res && res.documents) || []).forEach(function (d) {
            var id = d.name.split("/").pop();
            docs["usuarios/" + uid + "/meses/" + id] = d.fields.json.stringValue;
            estado.meses[id] = JSON.parse(d.fields.json.stringValue);
          });
          return res && res.nextPageToken ? pagina(res.nextPageToken) : null;
        });
      }
      return pagina(null).then(function () {
        subido = docs;
        return estado;
      });
    });
  };

  /* Sube solo los documentos que cambiaron y borra los meses que ya no están, en una sola escritura */
  nube.subir = function (estado) {
    var docs = docsDeEstado(estado);
    var writes = [];
    Object.keys(docs).forEach(function (ruta) {
      if (subido[ruta] !== docs[ruta]) {
        writes.push({ update: { name: base() + "/" + ruta, fields: { json: { stringValue: docs[ruta] } } } });
      }
    });
    Object.keys(subido).forEach(function (ruta) {
      if (!(ruta in docs)) writes.push({ delete: base() + "/" + ruta });
    });
    if (!writes.length) return Promise.resolve(false);
    return pedir("POST", base() + ":commit", { writes: writes }).then(function () {
      subido = docs;
      return true;
    });
  };

  nube.iniciar = function (alCambiarUsuario) {
    if (!nube.disponible) return;
    if (!global.firebase.apps.length) global.firebase.initializeApp(config);
    auth = global.firebase.auth();
    auth.onAuthStateChanged(function (usuario) {
      nube.usuario = usuario;
      subido = {};
      alCambiarUsuario(usuario);
    });
  };

  nube.entrar = function () {
    var proveedor = new global.firebase.auth.GoogleAuthProvider();
    proveedor.setCustomParameters({ prompt: "select_account" });
    return auth.signInWithPopup(proveedor).catch(function (err) {
      /* celulares o navegadores que bloquean el popup: redirigir */
      if (err && (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment")) {
        return auth.signInWithRedirect(proveedor);
      }
      throw err;
    });
  };

  nube.salir = function () {
    return auth.signOut();
  };

  BM.nube = nube;
})(window);
