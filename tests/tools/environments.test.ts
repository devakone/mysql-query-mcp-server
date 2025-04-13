import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runEnvironmentsTool } from '../../src/tools/environments.js';
import { Environment } from '../../src/types/index.js';

describe('environments tool', () => {
  const originalEnv = process.env;
  
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    
    // Clean any environment-specific variables
    Object.keys(process.env).forEach(key => {
      if (key.includes('_DB_')) {
        delete process.env[key];
      }
    });
    
    // Mock stderr to suppress debug output during tests
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });
  
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });
  
  it('should return empty environments when no DB configs are set', async () => {
    const result = await runEnvironmentsTool();
    expect(result).toHaveProperty('content');
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    
    const parsedContent = JSON.parse(result.content[0].text);
    expect(parsedContent.environments).toEqual([]);
    expect(parsedContent.count).toBe(0);
  });
  
  it('should detect local environment when LOCAL_DB_* vars are set', async () => {
    // Set up local environment variables
    process.env.LOCAL_DB_HOST = 'localhost';
    process.env.LOCAL_DB_USER = 'root';
    process.env.LOCAL_DB_NAME = 'test';
    
    const result = await runEnvironmentsTool();
    const parsedContent = JSON.parse(result.content[0].text);
    
    expect(parsedContent.environments).toContain('local');
    expect(parsedContent.count).toBe(1);
    expect(parsedContent.debug.envVars).toHaveProperty('LOCAL_DB_HOST', 'localhost');
  });
  
  it('should detect multiple environments when multiple DB configs are set', async () => {
    // Set up environment variables for multiple environments
    process.env.LOCAL_DB_HOST = 'localhost';
    process.env.LOCAL_DB_USER = 'root';
    process.env.LOCAL_DB_NAME = 'test';
    
    process.env.DEVELOPMENT_DB_HOST = 'dev.example.com';
    process.env.DEVELOPMENT_DB_USER = 'dev_user';
    process.env.DEVELOPMENT_DB_NAME = 'dev_db';
    
    const result = await runEnvironmentsTool();
    const parsedContent = JSON.parse(result.content[0].text);
    
    expect(parsedContent.environments).toContain('local');
    expect(parsedContent.environments).toContain('development');
    expect(parsedContent.environments).not.toContain('staging');
    expect(parsedContent.environments).not.toContain('production');
    expect(parsedContent.count).toBe(2);
  });
  
  it('should handle errors gracefully', async () => {
    // Mock Environment.enum to throw an error
    vi.spyOn(Environment, 'enum', 'get').mockImplementation(() => {
      throw new Error('Test error');
    });
    
    await expect(runEnvironmentsTool()).rejects.toThrow('Test error');
  });
}); 