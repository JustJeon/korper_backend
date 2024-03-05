import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';
import { generateTokens } from '../../lib/jwt';
import { USER_REGISTER_TYPE } from '../../lib/constants/user';
import { verifyKakaoCode } from '../../lib/loginUtil';

const parameter = {
  type: 'object',
  properties: {
    code: { type: 'string' }, // kakao에서 발급한 authorization code
  },
  required: ['code'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);
  const { code } = JSON.parse(event.body) as FromSchema<typeof parameter>;

  try {
    // kakao server에서 발급한 authorization code 검증 및 payload 조회
    let userEmail: string, fullName: string;
    try {
      const { email, name } = await verifyKakaoCode(code);
      userEmail = email;
      fullName = name;
    } catch (err) {
      console.log('[verifyNaverCode failed]', err);
      return { statusCode: 401, body: JSON.stringify({ code: 'Verification_Failed' }) };
    }

    let user = await mysqlUtil.getOne('tb_user', [], { user_email: userEmail });
    const processType = user ? 'signin' : 'signup';
    // 회원가입
    if (processType === 'signup') {
      await mysqlUtil.create('tb_user', {
        user_email: userEmail,
        user_name: fullName,
        register_type: USER_REGISTER_TYPE.NAVER,
        marketing_agreed: 1, // 가입시 마케팅 동의
      });
      user = await mysqlUtil.getOne('tb_user', [], { user_email: userEmail });
    }

    // 로그인
    await mysqlUtil.update('tb_user', { last_login_type: USER_REGISTER_TYPE.NAVER }, { idx: user.idx });
    await mysqlUtil.updateTimestamp('tb_user', 'last_login_date', { idx: user.idx });
    const { accessToken, refreshToken } = await generateTokens(event, user.idx);

    return { statusCode: 200, body: JSON.stringify({ processType, accessToken, refreshToken }) };
  } catch (err) {
    console.log('err', err);
    return { statusCode: 500, body: JSON.stringify({ code: 'Internal_Server_Error' }) };
  }
};
