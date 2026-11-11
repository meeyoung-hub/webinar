/**
 * =========================================================================
 * 웨비나 신청자 대상 구글 드라이브 파일 자동 발송 스크립트 (Google Apps Script)
 * =========================================================================
 * 
 * [시트 데이터 구조]
 * A열: 신청일시 (KST)
 * B열: 이름
 * C열: 이메일 주소 (수신자 - 2행부터)
 * D열: 개인정보제공 동의
 * E열: 발송 상태 (※ 스크립트가 자동으로 '발송 완료' 여부를 기록하여 중복 발송을 방지합니다)
 */

// ==============================================================================
// 1. 발송 환경 설정
// ==============================================================================
const EMAIL_CONFIG = {
  // 1) 보낼 구글 드라이브 파일의 ID를 아래 따옴표 안에 입력하세요.
  //    * 파일 ID 찾는 법: 구글 드라이브 파일 우클릭 > [공유] > [링크 복사]
  //    * 링크 예시: https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing
  //    * 위의 '/d/' 와 '/view' 사이의 고유 문자열(1A2B3C4D5E6F7G8H9I0J)이 바로 파일 ID입니다.
  DRIVE_FILE_ID: "여기에_구글드라이브_파일ID를_입력하세요",

  // 2) 발송될 이메일 제목
  SUBJECT: "[웨비나] 신청하신 웨비나 발표 자료 및 참가 안내 드립니다",

  // 3) 보낸 사람 표시 이름
  SENDER_NAME: "웨비나 운영팀"
};

// ==============================================================================
// 2. 전체 신청자 대상 파일 발송 함수
// ==============================================================================
function sendWebinarFiles() {
  var ui = SpreadsheetApp.getUi();

  // 드라이브 파일 ID 입력 확인
  if (!EMAIL_CONFIG.DRIVE_FILE_ID || EMAIL_CONFIG.DRIVE_FILE_ID.indexOf("여기에_") !== -1) {
    ui.alert("설정 필요", "스크립트 코드 상단의 EMAIL_CONFIG.DRIVE_FILE_ID에 구글 드라이브 파일 ID를 먼저 입력해 주세요.", ui.ButtonSet.OK);
    return;
  }

  // 구글 드라이브 파일 가져오기
  var file;
  try {
    file = DriveApp.getFileById(EMAIL_CONFIG.DRIVE_FILE_ID);
  } catch (err) {
    ui.alert("파일 오류", "구글 드라이브에서 파일을 찾을 수 없습니다.\n파일 ID를 다시 확인해 주세요:\n" + err.toString(), ui.ButtonSet.OK);
    return;
  }

  var attachment = file.getBlob();
  var fileName = file.getName();

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    ui.alert("안내", "발송할 신청자 데이터가 없습니다. (2행부터 데이터 필요)", ui.ButtonSet.OK);
    return;
  }

  // E열(발송 상태) 헤더가 없으면 자동 생성
  if (sheet.getRange(1, 5).getValue() === "") {
    sheet.getRange(1, 5)
      .setValue("메일 발송 상태")
      .setFontWeight("bold")
      .setBackground("#EEF2FF")
      .setHorizontalAlignment("center");
  }

  // 2행부터 마지막 행까지 (A~E열) 데이터 읽기
  var range = sheet.getRange(2, 1, lastRow - 1, 5);
  var values = range.getValues();

  var sentCount = 0;
  var skippedCount = 0;
  var failCount = 0;

  // 오늘 남은 구글 메일 일일 발송 한도 확인
  var remainingQuota = MailApp.getRemainingDailyQuota();
  Logger.log("오늘 남은 메일 발송 가능 건수: " + remainingQuota);

  for (var i = 0; i < values.length; i++) {
    var rowNumber = i + 2; // 실제 스프레드시트 행 번호
    var row = values[i];

    var name = (row[1] || "").toString().trim() || "참가자";
    var email = (row[2] || "").toString().trim(); // C열 이메일
    var currentStatus = (row[4] || "").toString().trim(); // E열 상태

    // 이메일 주소 유효성 검사
    if (!email || email.indexOf("@") === -1) {
      continue;
    }

    // 이미 발송 완료된 경우 건너뛰기 (중복 발송 방지)
    if (currentStatus.indexOf("발송 완료") !== -1) {
      skippedCount++;
      continue;
    }

    // 일일 쿼터 소진 확인
    if (remainingQuota <= 0) {
      ui.alert("할당량 초과", "오늘 보낼 수 있는 구글 메일 발송 한도가 소진되었습니다.\n내일 다시 실행하시면 남은 분들에게 이어서 발송됩니다.", ui.ButtonSet.OK);
      break;
    }

    // 개인 맞춤 HTML 이메일 본문
    var htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 28px; background-color: #ffffff;">
        <h2 style="color: #4f46e5; margin-top: 0; font-size: 20px;">안녕하세요, ${name}님!</h2>
        <p style="font-size: 14px; color: #334155;">
          웨비나 참가 신청이 정상적으로 완료되었습니다.<br>
          신청해 주신 분들께 드리는 <strong>${fileName}</strong> 파일을 첨부하여 전달해 드립니다.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
          <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 15px;">📌 웨비나 행사 안내</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.8;">
            <li><strong>행사 일시:</strong> 2025년 12월 18일 (목) 19:30 ~ 21:00</li>
            <li><strong>진행 방식:</strong> 온라인 Zoom 라이브 (행사 1시간 전 접속 링크 발송)</li>
            <li><strong>첨부 파일:</strong> ${fileName}</li>
          </ul>
        </div>

        <p style="font-size: 13px; color: #475569;">
          첨부된 파일을 확인해 주시고, 웨비나와 관련해 문의사항이 있으시면 언제든지 본 메일로 회신해 주시기 바랍니다.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">
          본 메일은 웨비나 신청 시 제공해 주신 이메일 주소로 자동 발송되었습니다.
        </p>
      </div>
    `;

    try {
      // 메일 발송 (파일 첨부)
      GmailApp.sendEmail(email, EMAIL_CONFIG.SUBJECT, "", {
        name: EMAIL_CONFIG.SENDER_NAME,
        htmlBody: htmlBody,
        attachments: [attachment]
      });

      // E열에 성공 상태 및 발송 시간 기록
      var sentTime = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm");
      sheet.getRange(rowNumber, 5)
        .setValue("발송 완료 (" + sentTime + ")")
        .setFontColor("#059669");

      sentCount++;
      remainingQuota--;

      // 연속 발송 시 짧은 대기 (스팸 방지)
      Utilities.sleep(300);

    } catch (sendErr) {
      Logger.log("발송 실패 (" + email + "): " + sendErr.toString());
      sheet.getRange(rowNumber, 5)
        .setValue("발송 실패 (" + sendErr.message + ")")
        .setFontColor("#dc2626");
      failCount++;
    }
  }

  // 발송 결과 안내 팝업
  var message = "총 발송 성공: " + sentCount + "건\n" +
                "중복 제외(이미 발송됨): " + skippedCount + "건\n" +
                (failCount > 0 ? "발송 실패: " + failCount + "건\n" : "") +
                "오늘 남은 일일 발송 가능량: " + remainingQuota + "건";

  ui.alert("발송 결과", message, ui.ButtonSet.OK);
}

// ==============================================================================
// 3. 테스트 발송 함수 (전체 발송 전 내 메일로 1건 시험 전송)
// ==============================================================================
function sendTestEmailToMe() {
  var ui = SpreadsheetApp.getUi();
  var myEmail = Session.getActiveUser().getEmail();

  if (!myEmail) {
    ui.alert("오류", "로그인된 사용자 이메일을 가져올 수 없습니다.", ui.ButtonSet.OK);
    return;
  }

  var file;
  try {
    file = DriveApp.getFileById(EMAIL_CONFIG.DRIVE_FILE_ID);
  } catch (err) {
    ui.alert("파일 오류", "구글 드라이브 파일 ID를 먼저 확인해 주세요:\n" + err.toString(), ui.ButtonSet.OK);
    return;
  }

  var attachment = file.getBlob();
  var fileName = file.getName();

  try {
    GmailApp.sendEmail(myEmail, "[테스트] " + EMAIL_CONFIG.SUBJECT, "", {
      name: EMAIL_CONFIG.SENDER_NAME,
      htmlBody: "<p>이것은 웨비나 첨부파일 발송 테스트 메일입니다.</p><p>첨부파일: <strong>" + fileName + "</strong></p>",
      attachments: [attachment]
    });
    ui.alert("테스트 발송 완료", "내 계정(" + myEmail + ")으로 테스트 메일이 정상 발송되었습니다!\n메일함에서 첨부파일을 확인해 보세요.", ui.ButtonSet.OK);
  } catch (err) {
    ui.alert("테스트 발송 실패", err.toString(), ui.ButtonSet.OK);
  }
}

// ==============================================================================
// 4. 구글 시트 상단 메뉴 자동 등록
// (스프레드시트를 새로고침하면 상단에 '🚀 웨비나 메일' 메뉴가 생깁니다)
// ==============================================================================
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🚀 웨비나 메일")
    .addItem("🧪 내 메일로 테스트 발송 (1건)", "sendTestEmailToMe")
    .addSeparator()
    .addItem("📨 신청자 전원에게 파일 발송 (C열 이메일)", "sendWebinarFiles")
    .addToUi();
}
