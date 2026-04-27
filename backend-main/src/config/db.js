const { Sequelize } = require("sequelize");
const env = require("./env");

const sslConfig = env.DB_SSL === "true"
  ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
  : {};

const sequelize = new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: "postgres",
  ...sslConfig,
});

module.exports = sequelize;
