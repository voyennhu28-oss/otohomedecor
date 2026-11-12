import { UserInfo } from '../../decorators/user.decorator';
import { File } from './dto/excel-util.interface';

class ImportExcel {
  file: File;
  user: UserInfo;
}

enum ColumnExport {
  REQUIRE_FIELDS = 'REQUIRE_FIELDS',
}

export { ImportExcel, ColumnExport };
