import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runQueryTool, isReadOnlyQuery } from '../../src/tools/query.js';
import { Environment } from '../../src/types/index.js';

// Manual mock for database query responses
const mockRows = [{ id: 1, name: 'Test User' }];
const mockFields = [
  { name: 'id', type: 'INT', length: 11 },
  { name: 'name', type: 'VARCHAR', length: 255 }
];

// Track if release was called
let releaseCalled = false;
let lastQuerySql = '';
let mockQueryShouldFail = false;
let mockQueryShouldTimeout = false;

// Mock for pools module
vi.mock('../../src/db/pools.js', () => {
  const mockPools = new Map();
  
  // Mock connection with simple object
  const mockConnection = {
    query: (sql) => {
      lastQuerySql = sql;
      
      if (mockQueryShouldFail) {
        return Promise.reject(new Error('Query execution error'));
      }
      
      if (mockQueryShouldTimeout) {
        return new Promise((resolve) => {
          setTimeout(resolve, 100000); // Long timeout that should trigger promise race
        });
      }
      
      return Promise.resolve([mockRows, mockFields]);
    },
    release: () => {
      releaseCalled = true;
      return Promise.resolve();
    }
  };
  
  // Mock pool
  const mockPool = {
    getConnection: () => Promise.resolve(mockConnection),
    end: () => Promise.resolve()
  };
  
  // Add environment to pools
  mockPools.set('local', mockPool);
  
  return { pools: mockPools };
});

describe('query tool', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    
    // Reset mock state
    releaseCalled = false;
    lastQuerySql = '';
    mockQueryShouldFail = false;
    mockQueryShouldTimeout = false;
    
    // Mock stderr to suppress debug output during tests
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });
  
  describe('isReadOnlyQuery function', () => {
    it('should accept SELECT statements', () => {
      expect(isReadOnlyQuery('SELECT * FROM users')).toBe(true);
      expect(isReadOnlyQuery('select * from users')).toBe(true);
      expect(isReadOnlyQuery('  SELECT * FROM users')).toBe(true);
    });
    
    it('should accept SHOW statements', () => {
      expect(isReadOnlyQuery('SHOW TABLES')).toBe(true);
      expect(isReadOnlyQuery('show databases')).toBe(true);
    });
    
    it('should accept DESCRIBE/DESC statements', () => {
      expect(isReadOnlyQuery('DESCRIBE users')).toBe(true);
      expect(isReadOnlyQuery('DESC users')).toBe(true);
    });
    
    it('should reject write operations', () => {
      expect(isReadOnlyQuery('INSERT INTO users VALUES (1, "test")')).toBe(false);
      expect(isReadOnlyQuery('UPDATE users SET name = "test"')).toBe(false);
      expect(isReadOnlyQuery('DELETE FROM users')).toBe(false);
      expect(isReadOnlyQuery('DROP TABLE users')).toBe(false);
      expect(isReadOnlyQuery('CREATE TABLE test (id INT)')).toBe(false);
    });
  });
  
  describe('runQueryTool function', () => {
    it('should validate and execute a read-only query', async () => {
      const result = await runQueryTool({
        sql: 'SELECT * FROM users',
        environment: 'local',
        timeout: 5000
      });
      
      // Verify result structure
      expect(result).toHaveProperty('content');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      // Verify the result content
      const parsedContent = JSON.parse(result.content[0].text);
      expect(parsedContent).toHaveProperty('rows', mockRows);
      expect(parsedContent).toHaveProperty('rowCount', 1);
      expect(parsedContent).toHaveProperty('executionTime');
      
      // Verify that the fields were processed correctly
      expect(parsedContent.fields).toHaveLength(2);
      expect(parsedContent.fields[0]).toHaveProperty('name', 'id');
      
      // Verify that connection was released
      expect(releaseCalled).toBe(true);
      
      // Verify the correct SQL was executed
      expect(lastQuerySql).toBe('SELECT * FROM users');
    });
    
    it('should reject non-read-only queries', async () => {
      await expect(runQueryTool({
        sql: 'INSERT INTO users VALUES (1, "test")',
        environment: 'local',
        timeout: 30000
      })).rejects.toThrow('Only SELECT, SHOW, DESCRIBE, and DESC queries are allowed');
      
      // Should not have executed a query
      expect(lastQuerySql).toBe('');
    });
    
    it('should throw an error when the environment is not found', async () => {
      await expect(runQueryTool({
        sql: 'SELECT * FROM users',
        environment: 'production', // Not in our mock pools
        timeout: 30000
      })).rejects.toThrow('No connection pool available for environment: production');
    });
    
    it('should handle query execution errors', async () => {
      mockQueryShouldFail = true;
      
      await expect(runQueryTool({
        sql: 'SELECT * FROM users',
        environment: 'local',
        timeout: 30000
      })).rejects.toThrow('Query execution failed: Query execution error');
      
      // Verify that connection was released even though query failed
      expect(releaseCalled).toBe(true);
    });
    
    it('should handle query timeout', async () => {
      mockQueryShouldTimeout = true;
      
      // Set a very short timeout to force the timeout path
      await expect(runQueryTool({
        sql: 'SELECT * FROM users',
        environment: 'local',
        timeout: 1 // 1ms timeout
      })).rejects.toThrow('Query execution failed: Query timeout after 1ms');
    });
  });
}); 