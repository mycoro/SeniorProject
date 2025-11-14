'use strict';

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

let pool;

function createPool() {
	if (pool) return pool;
	const {
		DB_HOST,
		DB_PORT,
		DB_USER,
		DB_PASSWORD,
		DB_NAME,
		DB_CONN_LIMIT,
		DB_SOCKET_PATH
	} = process.env;

	const base = {
		user: DB_USER || 'root',
		password: DB_PASSWORD || '',
		database: DB_NAME || 'nutrimind',
		waitForConnections: true,
		connectionLimit: DB_CONN_LIMIT ? Number(DB_CONN_LIMIT) : 10,
		queueLimit: 0,
		enableKeepAlive: true,
		keepAliveInitialDelay: 0
	};

	pool = mysql.createPool(
		DB_SOCKET_PATH && DB_SOCKET_PATH.trim()
			? { ...base, socketPath: DB_SOCKET_PATH }
			: { ...base, host: DB_HOST || '127.0.0.1', port: DB_PORT ? Number(DB_PORT) : 3306 }
	);
	return pool;
}

async function getConnection() {
	const p = createPool();
	return p.getConnection();
}

async function query(sql, params) {
	const p = createPool();
	const [rows] = await p.query(sql, params);
	return rows;
}

module.exports = {
	createPool,
	getConnection,
	query
};
