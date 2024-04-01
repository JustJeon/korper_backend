import { APIGatewayProxyEventV2WithLambdaAuthorizer } from 'aws-lambda';
import mysqlUtil from '../../lib/mysqlUtil';
import { getHeadObject, getPresignedUrl } from '../../lib/aws/s3Util';

export const handler = async (event: APIGatewayProxyEventV2WithLambdaAuthorizer<{ [key: string]: any }>) => {
  console.log('[event]', event);
  const userIdx = event.requestContext.authorizer.lambda.idx;

  // 모델 정보 조회
  const modelList = await mysqlUtil.getMany('tb_model', [], { userIdx });

  // 썸네일 presigned url 발급
  const modelListWithThumbnail = await Promise.all(
    modelList.map(async (model) => {
      const s3ThumbnailKey = `model/${model.uid}/thumbnail.png`;
      let thumbnailUrl = await getPresignedUrl(s3ThumbnailKey);
      const { error: thumbnailError } = await getHeadObject(s3ThumbnailKey);
      if (thumbnailError === 'NotFound') thumbnailUrl = null;
      model.thumbnailUrl = thumbnailUrl;
      model.modelUrl = null;
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({
      code: 'Success',
      message: 'success',
      result: { modelList: modelListWithThumbnail },
    }),
  };
};
