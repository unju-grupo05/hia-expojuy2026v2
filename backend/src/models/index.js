const Stand = require('./stand.model');
const UbicacionStand = require('./ubicacionStand.model');
const Expositor = require('./expositor.model');
const Noticia = require('./noticia.model');
const Galeria = require('./galeria.model');
const Agenda = require('./agenda.model');
const Eje = require('./eje.model');
const Correo = require('./correo.model');
const Usuario = require('./usuario.model');
const Media = require('./media.model');
const ReunionB2B = require('./reunionB2B.model');

// Asociaciones Stand <-> UbicacionStand (1 a 1 estricta con borrado en cascada)
if (!Stand.associations?.ubicacion) {
  Stand.hasOne(UbicacionStand, { foreignKey: 'standId', as: 'ubicacion', onDelete: 'CASCADE' });
}
if (!UbicacionStand.associations?.stand) {
  UbicacionStand.belongsTo(Stand, { foreignKey: 'standId', as: 'stand', onDelete: 'CASCADE' });
}

// Asociaciones Stand <-> Expositor (1 a N: un expositor puede tener múltiples stands)
if (!Stand.associations?.expositor) {
  Stand.belongsTo(Expositor, { foreignKey: 'expositorId', as: 'expositor' });
}
if (!Expositor.associations?.stands) {
  Expositor.hasMany(Stand, { foreignKey: 'expositorId', as: 'stands' });
}

module.exports = {
  Stand,
  UbicacionStand,
  Expositor,
  Noticia,
  Galeria,
  Agenda,
  Eje,
  Correo,
  Usuario,
  Media,
  ReunionB2B
};
