// Tiny helper for the feature files: texts built from pieces (names, counts) pick their language here;
// plain fixed texts are translated by the tables in strings.js like everywhere else.
window.ft = (en, de, id) => lang === "de" && de ? de : lang === "id" && id ? id : en;
