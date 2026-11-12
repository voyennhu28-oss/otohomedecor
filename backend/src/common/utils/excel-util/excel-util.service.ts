import { BadRequestException, Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { startCase } from 'lodash';
import { File, GenerateExcelParams } from './dto/excel-util.interface';
import { camelCase } from 'es-toolkit';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExcelUtilService {
  constructor(private prismaService: PrismaService) {}
  private customHeaders({ worksheet }) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
  }

  generateExcel({ worksheets = [] }: GenerateExcelParams) {
    if (worksheets.length === 0)
      throw new BadRequestException('Worksheets is empty!');

    const workbook = new Workbook();
    for (const worksheetData of worksheets) {
      const {
        sheetName = 'Sheet Name',
        data = [],
        fieldsExclude = ['id'],
        fieldsMapping,
        fieldsExtend = [],
      } = worksheetData;

      const worksheet = workbook.addWorksheet(sheetName);

      const fields: Record<string, any> =
        data[0] ?? this.prismaService[camelCase(sheetName)].fields ?? {};

      const dataColumns = Object.keys(fields)
        .reduce<string[]>((acc, field) => {
          if (fieldsExclude.includes(field)) return acc;
          const currentField = fieldsMapping?.[field] ?? field;
          return [...acc, currentField];
        }, [])
        .concat(data.length === 0 ? fieldsExtend : []);
      const widthColumn = Math.floor(100 / dataColumns.length);
      const columns = dataColumns.map((column) => ({
        header: startCase(column),
        key: column,
        width: widthColumn,
      }));
      worksheet.columns = columns;
      worksheet.addRows(data);

      this.customHeaders({ worksheet });
    }

    return workbook;
  }

  private convertHyperlinkToString(value) {
    return value?.hyperlink ? value.text : value;
  }

  private cleanData(value) {
    const stringData = this.convertHyperlinkToString(value);
    return stringData;
  }

  async read(file: File) {
    if (!file) throw new BadRequestException('File not found!');

    const workbook = new Workbook();
    await workbook.xlsx.readFile(file.path);
    const sheetsData = workbook.worksheets.reduce((acc, worksheet) => {
      const sheetData: object[] = [];
      const headers = worksheet.getRow(1);
      const fields = (headers.values as any[]).filter((item) => Boolean(item));
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const rowData = row.values;
        const value = fields.reduce((acc, field, index) => {
          const fieldName = camelCase(field);
          const fieldValue = this.cleanData(rowData[index + 1]);
          return { ...acc, [fieldName]: fieldValue };
        }, {});
        sheetData.push(value);
      });
      return { ...acc, [worksheet.name]: sheetData };
    }, {});

    return sheetsData;
  }

  generateExcelSheetsName(services: Record<string, string>) {
    return Object.keys(services).reduce((acc, service) => {
      const sheetName = service.replace(`Service`, '');
      return { ...acc, [service]: sheetName };
    }, {});
  }
}
