/**
 * =========================================================================
 * 웨비나 참가 신청 구글 스프레드시트 자동 연동 스크립트 (v2.0 - 컴퓨터 정보 제외)
 * =========================================================================
 * 
 * [수정된 내용]
 * - 오직 [신청일시, 이름, 이메일, 개인정보제공 동의] 4개 항목만 기록됩니다.
 * - 컴퓨터/기기/브라우저 정보(접속 환경)는 전송 및 저장에서 완전히 제외되었습니다.
 * - 기존 시트에 5번째 '접속 환경' 열이 남아있을 경우 자동으로 삭제 정리합니다.
 * 
 * [배포 및 반영 방법 - 중요!]
 * 1. 구글 스프레드시트의 [확장 프로그램] > [Apps Script]로 이동합니다.
 * 2. 기존 코드를 모두 지우고 이 파일의 전체 코드를 붙여넣습니다.
 * 3. 상단 [저장] 아이콘(디스크 모양)을 클릭합니다.
 * 4. ★매우 중요★ 코드를 저장한 후 반드시 '새 배포'를 진행해야 최신 코드가 실행됩니다:
 *    - 우측 상단 파란색 [배포] 버튼 클릭 > [새 배포] 클릭
 *    - 유형: 웹 앱(Web app)
 *    - 설명: "웨비나 신청 v2"
 *    - 다음 사용자로 실행: "나"
 *    - 액세스 권한: "모든 사용자(Anyone)"
 *    - [배포] 클릭 ➔ 새 웹 앱 URL 복사
 * 5. 새로 복사한 웹 앱 URL을 랜딩페이지 설정에 등록합니다.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // 기존 시트에 5번째 열('접속 환경')이 남아있다면 깔끔하게 삭제 정리
    if (sheet.getLastColumn() >= 5) {
      try {
        sheet.deleteColumn(5);
      } catch (colErr) {
        // 이미 없거나 삭제 불가 시 무시
      }
    }

    // 1행 헤더 확인 및 생성/갱신 (4개 열만 명시)
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["신청일시 (KST)", "이름", "이메일", "개인정보제공 동의"]);
      var headerRange = sheet.getRange(1, 1, 1, 4);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#F3F4F6");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    } else {
      // 1행 헤더의 4개 열 제목을 최신으로 확정
      sheet.getRange(1, 1, 1, 4).setValues([["신청일시 (KST)", "이름", "이메일", "개인정보제공 동의"]]);
    }

    // 전송된 파라미터 파싱
    var data = {};
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    // 컴퓨터/기기 정보는 일체 취급하지 않고 오직 3가지 입력값만 추출
    var name = (data.name || "").toString().trim();
    var email = (data.email || "").toString().trim();
    var privacy = data.privacy ? "동의" : "미동의";

    // 한국 시간(KST) 타임스탬프
    var timestamp = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd HH:mm:ss");

    // 다음 빈 행을 찾아 정확히 A~D(4개) 열에만 데이터를 기록합니다.
    var nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, 4).setValues([[timestamp, name, email, privacy]]);

    // 성공 응답 반환
    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      message: "웨비나 신청이 성공적으로 완료되었습니다.",
      data: {
        timestamp: timestamp,
        name: name,
        email: email,
        privacy: privacy
      }
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

// 브라우저 직접 접속 또는 GET 요청 테스트용
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    result: "success",
    message: "웨비나 신청 API 서비스 (v2.0) - 컴퓨터 정보 수집 제외 버전이 정상 작동 중입니다."
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * [수동 정리용 함수]
 * Apps Script 상단 함수 목록에서 'cleanExistingSheet'를 선택하고 [실행]을 누르면,
 * 기존 시트의 5번째 열('접속 환경')을 즉시 삭제하고 헤더를 4개 열로 깔끔하게 정리해 줍니다.
 */
function cleanExistingSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastColumn() >= 5) {
    sheet.deleteColumn(5);
  }
  sheet.getRange(1, 1, 1, 4).setValues([["신청일시 (KST)", "이름", "이메일", "개인정보제공 동의"]]);
  Logger.log("시트가 성공적으로 4개 컬럼으로 정리되었습니다.");
}
