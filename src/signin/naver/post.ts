import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { FromSchema } from 'json-schema-to-ts';
import mysqlUtil from '../../lib/mysqlUtil';
import { generateTokens } from '../../lib/jwt';
import { USER_REGISTER_TYPE } from '../../lib/constants/user';
import { verifyNaverToken } from '../../lib/loginUtil';

const parameter = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' }, // naver에서 발급한 authorization code
    signupFlag: { type: 'boolean' }, // 회원가입 처리 요청 여부
    marketingAgreed: { type: 'boolean' }, // 마케팅 동의 여부
  },
  required: ['accessToken'],
} as const;

export const handler = async (event: APIGatewayProxyEventV2) => {
  console.log('[event]', event);
  const {
    accessToken: naverAccessToken,
    signupFlag,
    marketingAgreed,
  } = JSON.parse(event.body) as FromSchema<typeof parameter>;

  try {
    // naver server에서 발급한 authorization code 검증 및 payload 조회
    let userEmail: string, fullName: string;
    try {
      const { email, name } = await verifyNaverToken(naverAccessToken);
      userEmail = email;
      fullName = name;
    } catch (err) {
      console.log('[verifyNaverToken failed]', err);
      return { statusCode: 401, body: JSON.stringify({ code: 'Verification_Failed' }) };
    }

    let user = await mysqlUtil.getOne('tb_user', [], { user_email: userEmail });
    if (!user) {
      // 회원가입 되어 있지 않은 유저가 로그인 요청한 경우
      if (!signupFlag) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            code: 'Require_Signup',
            message: 'Require Signup',
            result: { accessToken: null, refreshToken: null },
          }),
        };
      }
      // 회원가입 (요청한 경우)
      else {
        await mysqlUtil.create('tb_user', {
          user_email: userEmail,
          user_name: fullName,
          register_type: USER_REGISTER_TYPE.NAVER,
          marketing_agreed: marketingAgreed,
        });
        user = await mysqlUtil.getOne('tb_user', [], { user_email: userEmail });
      }
    }

    // 로그인
    await mysqlUtil.updateTimestamp('tb_user', 'last_login_date', { idx: user.idx });
    const { accessToken, refreshToken } = await generateTokens(event, user.idx);

    return {
      statusCode: 200,
      body: JSON.stringify({ code: 'Success', message: 'success', result: { accessToken, refreshToken } }),
    };
  } catch (err) {
    console.log('err', err);
    return { statusCode: 500, body: JSON.stringify({ code: 'Internal_Server_Error' }) };
  }
};
