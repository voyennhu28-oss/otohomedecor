import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AdminOnly } from '../../common/decorators/admin-only.decorator';
import { objectId } from '../../common/dto/param.dto';
import { CollectionProductsDto } from './dto/product.dto';
import { ProductsService } from './products.service';

class CollectionIDParamDto extends createZodDto(
  z.object({ collectionID: objectId }),
) {}

class CollectionProductParamDto extends createZodDto(
  z.object({ collectionID: objectId, productID: objectId }),
) {}

@ApiTags('Admin / Collections')
@AdminOnly()
@Controller('admin/collections/:collectionID/products')
export class AdminCollectionProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  add(
    @Param() { collectionID }: CollectionIDParamDto,
    @Body() { productIDs }: CollectionProductsDto,
  ) {
    return this.productsService.addToCollection(collectionID, productIDs);
  }

  @Delete(':productID')
  remove(@Param() { collectionID, productID }: CollectionProductParamDto) {
    return this.productsService.removeFromCollection(collectionID, productID);
  }
}
