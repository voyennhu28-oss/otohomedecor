interface GenerateExcelParams {
  worksheets: {
    sheetName?: string;
    data: any[];
    fieldsExclude?: string[];
    fieldsMapping?: Record<string, string>;
    fieldsExtend?: string[];
  }[];
}

// type File = Express.Multer.File;
type File = any;

export type { GenerateExcelParams, File };
