/* Config web del proyecto de Firebase. Estas claves son públicas por diseño:
   lo que protege los datos son las reglas de firestore.rules.
   Si queda en null, la app funciona sin login y guarda solo en este dispositivo. */
window.BM = window.BM || {};
window.BM.firebaseConfig = {
  apiKey: "AIzaSyC6TOkbCxpVhiin3yTBZylKfRR0hmL6B6g",
  authDomain: "balance-mensual-joaco.firebaseapp.com",
  projectId: "balance-mensual-joaco",
  appId: "1:1061043462600:web:2323024d46268fbc8120fd",
  messagingSenderId: "1061043462600"
};
