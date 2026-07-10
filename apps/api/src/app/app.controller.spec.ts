import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AppController', () => {
  let app: TestingModule;
  const queryRaw = jest.fn();

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();
  });

  beforeEach(() => queryRaw.mockReset());

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toEqual({ message: 'Hello API' });
    });
  });

  describe('health', () => {
    it('returns ok + db up when the DB responds', async () => {
      queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      const result = await app.get(AppController).health();
      expect(result.status).toBe('ok');
      expect(result.db).toBe('up');
    });

    it('throws 503 when the DB query fails', async () => {
      queryRaw.mockRejectedValue(new Error('connection refused'));
      await expect(app.get(AppController).health()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
