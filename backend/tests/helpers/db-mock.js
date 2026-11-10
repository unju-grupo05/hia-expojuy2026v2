/**
 * Mock compartido de `config/database` para tests que importan `index.js`.
 *
 * Evita que Sequelize intente conectarse a PostgreSQL: `define` devuelve
 * modelos falsos cuyos métodos resuelven datos vacíos y las asociaciones
 * son no-op. Cada llamada a `define` crea un modelo independiente.
 */
function crearModelo() {
    return {
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findByPk: jest.fn().mockResolvedValue(null),
        findAndCountAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue([0]),
        destroy: jest.fn().mockResolvedValue(0),
        count: jest.fn().mockResolvedValue(0),
        belongsTo: jest.fn(),
        hasMany: jest.fn(),
        hasOne: jest.fn(),
        addHook: jest.fn(),
        associations: {},
        toJSON() {
            return {};
        }
    };
}

module.exports = {
    define: jest.fn(() => crearModelo()),
    transaction: jest.fn().mockResolvedValue({
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined)
    })
};
