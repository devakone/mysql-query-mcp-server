import { describe, it, expect } from 'vitest';
import { parseKeychainRef, DEFAULT_SERVICE } from '../../src/credentials/keychain.js';

const context = { environment: 'production' as const, envPrefix: 'PRODUCTION' };

describe('keychain reference parsing', () => {
  it('uses the default service and the environment name when given nothing', () => {
    expect(parseKeychainRef('', context)).toEqual({
      service: DEFAULT_SERVICE,
      account: 'production',
    });
  });

  it('treats a bare value as the account under the default service', () => {
    expect(parseKeychainRef('prod-db', context)).toEqual({
      service: DEFAULT_SERVICE,
      account: 'prod-db',
    });
  });

  it('splits service and account', () => {
    expect(parseKeychainRef('my-service/my-account', context)).toEqual({
      service: 'my-service',
      account: 'my-account',
    });
  });

  it('tolerates the leading slashes left by a :// style reference', () => {
    expect(parseKeychainRef('//my-service/my-account', context)).toEqual({
      service: 'my-service',
      account: 'my-account',
    });
  });

  it('keeps slashes inside the account name', () => {
    expect(parseKeychainRef('svc/team/prod/db', context)).toEqual({
      service: 'svc',
      account: 'team/prod/db',
    });
  });

  it('falls back to the environment when the account half is empty', () => {
    expect(parseKeychainRef('my-service/', context)).toEqual({
      service: 'my-service',
      account: 'production',
    });
  });
});
