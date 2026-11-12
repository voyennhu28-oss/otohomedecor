export abstract class FileStrategy {
  abstract upload(fileName: string, fileStorageDestination: string): any;
  abstract remove(fileName: string): any;
}
