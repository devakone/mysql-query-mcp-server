import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runInfoTool } from '../../src/tools/info.js';
import { RowDataPacket, FieldPacket } from 'mysql2/promise';

// Track mock state
let releaseCalled = false;
let queryCount = 0;
let mockQueryShouldFail = false;

// Mock responses for each query call
const mockResponses = [
  // Version query
  [[{ version: '8.0.32' } as RowDataPacket], [] as FieldPacket[]],
  
  // Status query
  [[
    { Variable_name: 'Uptime', Value: '12345' } as RowDataPacket,
    { Variable_name: 'Threads_connected', Value: '10' } as RowDataPacket
  ], [] as FieldPacket[]],
  
  // Variables query
  [[
    { Variable_name: 'max_connections', Value: '151' } as RowDataPacket,
    { Variable_name: 'version', Value: '8.0.32' } as RowDataPacket
  ], [] as FieldPacket[]],
  
  // Process list query
  [[
    { Id: 1, User: 'root', Host: 'localhost', Command: 'Query', Time: 0 } as RowDataPacket
  ], [] as FieldPacket[]],
  
  // Databases query
  [[
    { Database: 'mysql' } as RowDataPacket,
    { Database: 'information_schema' } as RowDataPacket,
    { Database: 'test' } as RowDataPacket
  ], [] as FieldPacket[]]
];

// Mock the DB pools module
vi.mock('../../src/db/pools.js', () => {
  const mockPools = new Map();
  
  // Mock connection with simple functions
  const mockConnection = {
    query: (sql) => {
      if (mockQueryShouldFail) {
        return Promise.reject(new Error('Connection error'));
      }
      
      // Return the appropriate response based on the query count
      const response = mockResponses[queryCount];
      queryCount++;
      return Promise.resolve(response);
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
  
  // Add mock pool for local environment
  mockPools.set('local', mockPool);
  
  return { 
    pools: mockPools
  };
});

describe('info tool', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    
    // Reset mock state
    releaseCalled = false;
    queryCount = 0;
    mockQueryShouldFail = false;
    
    // Mock stderr to suppress debug output during tests
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });
  
  it('should retrieve and format database information', async () => {
    // Run the info tool
    const result = await runInfoTool({ environment: 'local' });
    
    // Verify result structure
    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    // Parse and verify content
    const parsedContent = JSON.parse(result.content[0].text);
    expect(parsedContent).toHaveProperty('version', '8.0.32');
    expect(parsedContent).toHaveProperty('status', 'Up 12345 seconds');
    expect(parsedContent.variables).toHaveProperty('max_connections', '151');
    expect(parsedContent.processlist).toHaveLength(1);
    expect(parsedContent.databases).toContain('mysql');
    expect(parsedContent.databases).toContain('test');
    
    // Verify connection was released
    expect(releaseCalled).toBe(true);
    
    // Verify all queries were called
    expect(queryCount).toBe(5);
  });
  
  it('should throw error when environment not found', async () => {
    await expect(runInfoTool({ environment: 'production' }))
      .rejects.toThrow('No connection pool available for environment: production');
  });
  
  it('should handle database query errors', async () => {
    mockQueryShouldFail = true;
    
    await expect(runInfoTool({ environment: 'local' }))
      .rejects.toThrow('Failed to get database info: Connection error');
    
    // Verify connection was released even after error
    expect(releaseCalled).toBe(true);
  });
}); 