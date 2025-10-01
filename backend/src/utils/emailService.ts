import nodemailer from 'nodemailer';

// 이메일 설정 (실제 운영 시에는 환경변수로 관리)
const emailConfig = {
  host: 'smtp.gmail.com', // Gmail SMTP 서버
  port: 587,
  secure: false, // TLS 사용
  auth: {
    user: process.env.EMAIL_USER || 'dyauction6@gmail.com', // Gmail 계정
    pass: process.env.EMAIL_PASS || 'uddq anbc tyhp gifg', // Gmail 앱 비밀번호 (16자리)
  },
};

// 이메일 전송기 생성
const transporter = nodemailer.createTransport(emailConfig);

// 낙찰 알림 이메일 발송
export const sendWinNotificationEmail = async (
  userEmail: string,
  username: string,
  auctionTitle: string,
  finalPrice: number,
  auctionId: number
) => {
  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to: userEmail,
      subject: `🎉 축하합니다! "${auctionTitle}" 경매에서 낙찰되었습니다!`,
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🎉 축하합니다!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">경매에서 낙찰되었습니다</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">낙찰 정보</h2>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #666;"><strong>경매 상품:</strong> ${auctionTitle}</p>
              <p style="margin: 5px 0; color: #666;"><strong>경매 ID:</strong> #${auctionId}</p>
              <p style="margin: 5px 0; color: #666;"><strong>낙찰가:</strong> ₩${finalPrice.toLocaleString()}</p>
            </div>
            
            <div style="background-color: #FFF3E0; padding: 20px; border-radius: 8px; border-left: 4px solid #FF9800;">
              <h3 style="color: #E65100; margin-top: 0;">⚠️ 중요: 입금 안내</h3>
              <p style="color: #E65100; margin-bottom: 15px;"><strong>2일 이내로 입금을 완료해주세요.</strong></p>
              
              <h4 style="color: #E65100; margin-bottom: 10px;">입금 계좌 정보:</h4>
              <div style="background-color: white; padding: 15px; border-radius: 5px; border: 1px solid #FFB74D;">
                <p style="margin: 5px 0; color: #333;"><strong>은행:</strong> 케이뱅크</p>
                <p style="margin: 5px 0; color: #333;"><strong>계좌번호:</strong> 888-002-618202</p>
                <p style="margin: 5px 0; color: #333;"><strong>예금주:</strong> 원영서</p>
                <p style="margin: 5px 0; color: #333;"><strong>입금액:</strong> ₩${finalPrice.toLocaleString()}</p>
              </div>
              
              <p style="color: #E65100; font-size: 14px; margin-top: 15px;">
                💡 입금 시 입금자명에 <strong>"${username}"</strong>을 명시해주세요.
              </p>
            </div>
            
            <div style="margin-top: 25px; padding: 20px; background-color: #E3F2FD; border-radius: 8px; border-left: 4px solid #2196F3;">
              <h4 style="color: #1976D2; margin-top: 0;">📞 문의사항</h4>
              <p style="color: #1976D2; margin-bottom: 5px;">입금 관련 문의사항이 있으시면 아래로 연락주세요:</p>
              <p style="color: #1976D2; margin: 5px 0;"><strong>이메일:</strong> dyauction6@gmail.com/p>
              <p style="color: #1976D2; margin: 5px 0;"><strong>전화:</strong> 없음</p>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 14px;">
                이 이메일은 DY Auction 시스템에서 자동으로 발송되었습니다.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
};

// 경매 승인 알림 이메일 발송
export const sendApprovalNotificationEmail = async (
  userEmail: string,
  username: string,
  auctionTitle: string,
  auctionId: number
) => {
  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to: userEmail,
      subject: `✅ "${auctionTitle}" 경매가 승인되었습니다!`,
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ 경매 승인 완료!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">등록하신 경매가 승인되었습니다</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">승인된 경매 정보</h2>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #666;"><strong>경매 상품:</strong> ${auctionTitle}</p>
              <p style="margin: 5px 0; color: #666;"><strong>경매 ID:</strong> #${auctionId}</p>
              <p style="margin: 5px 0; color: #666;"><strong>승인 일시:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            
            <div style="background-color: #E8F5E8; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50;">
              <h4 style="color: #2E7D32; margin-top: 0;">🎯 다음 단계</h4>
              <p style="color: #2E7D32; margin-bottom: 10px;">이제 경매가 활성화되어 사용자들이 입찰할 수 있습니다.</p>
              <ul style="color: #2E7D32; margin: 10px 0; padding-left: 20px;">
                <li>경매 진행 상황을 실시간으로 확인할 수 있습니다</li>
                <li>입찰자들과 소통할 수 있습니다</li>
                <li>경매 종료 후 낙찰자와 거래를 진행할 수 있습니다</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 14px;">
                이 이메일은 DY Auction 시스템에서 자동으로 발송되었습니다.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
};

// 핫한 경매 등록 알림 이메일 발송
export const sendHotAuctionNotificationEmail = async (
  userEmail: string,
  username: string,
  auctionTitle: string,
  auctionId: number
) => {
  try {
    const mailOptions = {
      from: emailConfig.auth.user,
      to: userEmail,
      subject: `🔥 "${auctionTitle}" 경매가 핫한 경매로 선정되었습니다!`,
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: #FF6B35; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔥 핫한 경매 선정!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">등록하신 경매가 핫한 경매로 선정되었습니다</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-bottom: 20px;">핫한 경매 정보</h2>
            
            <div style="background-color: #FFF3E0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0; color: #E65100;"><strong>경매 상품:</strong> ${auctionTitle}</p>
              <p style="margin: 5px 0; color: #E65100;"><strong>경매 ID:</strong> #${auctionId}</p>
              <p style="margin: 5px 0; color: #E65100;"><strong>선정 일시:</strong> ${new Date().toLocaleString('ko-KR')}</p>
            </div>
            
            <div style="background-color: #E8F5E8; padding: 20px; border-radius: 8px; border-left: 4px solid #4CAF50;">
              <h4 style="color: #2E7D32; margin-top: 0;">🎉 특별 혜택</h4>
              <ul style="color: #2E7D32; margin: 10px 0; padding-left: 20px;">
                <li>메인 화면 상단에 크게 표시됩니다</li>
                <li>더 많은 사용자들이 경매를 발견할 수 있습니다</li>
                <li>입찰 참여율이 크게 증가할 수 있습니다</li>
                <li>경매 성공 확률이 높아집니다</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 14px;">
                이 이메일은 DY Auction 시스템에서 자동으로 발송되었습니다.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    return false;
  }
};

export default {
  sendWinNotificationEmail,
  sendApprovalNotificationEmail,
  sendHotAuctionNotificationEmail,
};
