import { TestingModule } from '@nestjs/testing';
import { FileUtilService } from './file-util.service';
import { JwtService } from '@nestjs/jwt';
import { AutoMockingModule } from '../../../../test/auto-mocking/auto-mocking.module';

describe('FileUtilService', () => {
  let service: FileUtilService;

  beforeEach(async () => {
    const module: TestingModule = await AutoMockingModule.createTestingModule({
      providers: [FileUtilService, JwtService],
    });

    service = module.get<FileUtilService>(FileUtilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
