import {
  BadRequestException,
  ForbiddenException,
  type ArgumentsHost,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(): {
  host: ArgumentsHost;
  res: { status: jest.Mock; json: jest.Mock };
} {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({ method: 'GET', url: '/x' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, res };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('maps a string HttpException to code + message', () => {
    const { host, res } = makeHost();
    filter.catch(new BadRequestException('bad input'), host);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'BAD_REQUEST', message: 'bad input' },
    });
  });

  it('forwards a structured { code, message, details } throw', () => {
    const { host, res } = makeHost();
    filter.catch(
      new ForbiddenException({
        code: 'USER_NOT_SYNCED',
        message: 'sync first',
        details: { hint: 'call /auth/sync' },
      }),
      host,
    );
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: {
        code: 'USER_NOT_SYNCED',
        message: 'sync first',
        details: { hint: 'call /auth/sync' },
      },
    });
  });

  it('joins ValidationPipe array messages into one line', () => {
    const { host, res } = makeHost();
    filter.catch(new BadRequestException({ message: ['a', 'b'] }), host);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'BAD_REQUEST', message: 'a; b' },
    });
  });

  it('maps a generic Error to a 500 envelope (stack hidden)', () => {
    const { host, res } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      data: null,
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'boom' },
    });
  });
});
