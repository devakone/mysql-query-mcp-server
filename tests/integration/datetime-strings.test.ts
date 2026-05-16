import { describe, expect, it } from 'vitest';
import { createConnection, type ConnectionOptions, type RowDataPacket } from 'mysql2/promise';
import { DEFAULT_MYSQL_TIMEZONE } from '../../src/db/options.js';

const runIntegrationTest = process.env.MYSQL_DATETIME_INTEGRATION === 'true';
const maybeIt = runIntegrationTest ? it : it.skip;

describe('datetime string integration', () => {
  maybeIt('round-trips a known UTC DATETIME as the stored wall-clock string', async () => {
    const options: ConnectionOptions = {
      host: process.env.MYSQL_DATETIME_TEST_HOST || process.env.LOCAL_DB_HOST,
      user: process.env.MYSQL_DATETIME_TEST_USER || process.env.LOCAL_DB_USER,
      password: process.env.MYSQL_DATETIME_TEST_PASS || process.env.LOCAL_DB_PASS,
      database: process.env.MYSQL_DATETIME_TEST_DB || process.env.LOCAL_DB_NAME,
      port: Number(process.env.MYSQL_DATETIME_TEST_PORT || process.env.LOCAL_DB_PORT || 3306),
      dateStrings: true,
      timezone: process.env.MYSQL_TIMEZONE || DEFAULT_MYSQL_TIMEZONE,
    };
    const insertedDatetime = '2026-05-13 16:12:08';
    const connection = await createConnection(options);

    try {
      await connection.query('CREATE TEMPORARY TABLE datetime_string_test (created_at DATETIME NOT NULL)');
      await connection.execute('INSERT INTO datetime_string_test (created_at) VALUES (?)', [insertedDatetime]);

      const [rows] = await connection.query<RowDataPacket[]>('SELECT created_at FROM datetime_string_test');

      expect(typeof rows[0].created_at).toBe('string');
      expect(rows[0].created_at).toBe(insertedDatetime);
    } finally {
      await connection.end();
    }
  });
});
