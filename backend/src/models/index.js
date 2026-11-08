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
const VisitaStand = require('./visitasStands.model');
const ResenaStand = require('./resenasStands.model');
const AsistenciaAgenda = require('./asistenciasAgenda.model');
const LogChatbot = require('./logsChatbot.model');

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

// Asociaciones Stand <-> Eje (N a 1)
if (!Stand.associations?.eje) {
  Stand.belongsTo(Eje, { foreignKey: 'eje_id', as: 'eje' });
}
if (!Eje.associations?.stands) {
  Eje.hasMany(Stand, { foreignKey: 'eje_id', as: 'stands' });
}

// Asociaciones Stand <-> VisitaStand (1 a N)
if (!Stand.associations?.visitas) {
  Stand.hasMany(VisitaStand, { foreignKey: 'stand_id', as: 'visitas' });
}
if (!VisitaStand.associations?.stand) {
  VisitaStand.belongsTo(Stand, { foreignKey: 'stand_id', as: 'stand' });
}

// Asociaciones Usuario <-> VisitaStand (1 a N opcional)
if (!Usuario.associations?.visitas) {
  Usuario.hasMany(VisitaStand, { foreignKey: 'usuario_id', sourceKey: 'legajo', as: 'visitas' });
}
if (!VisitaStand.associations?.usuario) {
  VisitaStand.belongsTo(Usuario, { foreignKey: 'usuario_id', targetKey: 'legajo', as: 'usuario' });
}

// Asociaciones Stand <-> ResenaStand (1 a N)
if (!Stand.associations?.resenas) {
  Stand.hasMany(ResenaStand, { foreignKey: 'stand_id', as: 'resenas' });
}
if (!ResenaStand.associations?.stand) {
  ResenaStand.belongsTo(Stand, { foreignKey: 'stand_id', as: 'stand' });
}

// Asociaciones Usuario <-> ResenaStand (1 a N)
if (!Usuario.associations?.resenas) {
  Usuario.hasMany(ResenaStand, { foreignKey: 'usuario_id', sourceKey: 'legajo', as: 'resenas' });
}
if (!ResenaStand.associations?.usuario) {
  ResenaStand.belongsTo(Usuario, { foreignKey: 'usuario_id', targetKey: 'legajo', as: 'usuario' });
}

// Asociaciones Agenda <-> AsistenciaAgenda (1 a N)
if (!Agenda.associations?.asistencias) {
  Agenda.hasMany(AsistenciaAgenda, { foreignKey: 'agenda_id', as: 'asistencias' });
}
if (!AsistenciaAgenda.associations?.agenda) {
  AsistenciaAgenda.belongsTo(Agenda, { foreignKey: 'agenda_id', as: 'agenda' });
}

// Asociaciones Usuario <-> AsistenciaAgenda (1 a N)
if (!Usuario.associations?.asistencias) {
  Usuario.hasMany(AsistenciaAgenda, { foreignKey: 'usuario_id', sourceKey: 'legajo', as: 'asistencias' });
}
if (!AsistenciaAgenda.associations?.usuario) {
  AsistenciaAgenda.belongsTo(Usuario, { foreignKey: 'usuario_id', targetKey: 'legajo', as: 'usuario' });
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
  ReunionB2B,
  VisitaStand,
  ResenaStand,
  AsistenciaAgenda,
  LogChatbot
};
