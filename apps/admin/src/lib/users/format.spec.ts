import { roleActionDisabledReason } from './format';

describe('roleActionDisabledReason', () => {
  it('blocks self', () => {
    expect(roleActionDisabledReason({ isSelf: true, isEnvAdmin: false })).toMatch(/own role/);
  });
  it('blocks env admins', () => {
    expect(roleActionDisabledReason({ isSelf: false, isEnvAdmin: true })).toMatch(/ADMIN_EMAILS/);
  });
  it('allows everyone else', () => {
    expect(roleActionDisabledReason({ isSelf: false, isEnvAdmin: false })).toBeNull();
  });
});
