/**
 * 웨비나 참가 신청 랜딩페이지 스크립트
 * 구글 스프레드시트 (Google Apps Script Web App) 연동
 */

// ==============================================================================
// 1. 구글 웹 앱 URL 설정
// 여기에 Google Apps Script 배포 후 생성된 "웹 앱 URL"을 입력하세요.
// 예: "https://script.google.com/macros/s/AKfycbx.../exec"
// ==============================================================================
const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzm6_PicI5lXOGp56jcZx2u5OjRE85jxniZymNSV6OjC7cmckU8pSSu71hPbSfIg8Cn6g/exec";

// 로컬 스토리지에 저장된 사용자 커스텀 URL이 있으면 우선 사용
function getScriptUrl() {
  const customUrl = localStorage.getItem("webinar_script_url");
  return customUrl || DEFAULT_SCRIPT_URL;
}

// ==============================================================================
// 2. DOM 요소 참조
// ==============================================================================
const form = document.getElementById("registrationForm");
const nameInput = document.getElementById("userName");
const emailInput = document.getElementById("userEmail");
const privacyCheckbox = document.getElementById("privacyConsent");

const nameError = document.getElementById("nameError");
const emailError = document.getElementById("emailError");
const privacyError = document.getElementById("privacyError");
const formErrorMessage = document.getElementById("formErrorMessage");

const submitBtn = document.getElementById("submitButton");
const btnText = document.getElementById("btnText");
const btnArrow = document.getElementById("btnArrow");
const btnSpinner = document.getElementById("btnSpinner");

// 모달 요소
const privacyModal = document.getElementById("privacyModal");
const openPrivacyBtn = document.getElementById("openPrivacyBtn");
const closePrivacyBtn = document.getElementById("closePrivacyBtn");
const confirmPrivacyBtn = document.getElementById("confirmPrivacyBtn");

const successModal = document.getElementById("successModal");
const closeSuccessBtn = document.getElementById("closeSuccessBtn");
const registeredName = document.getElementById("registeredName");
const registeredEmail = document.getElementById("registeredEmail");

// 스프레드시트 설정 패널 요소
const toggleConfigBtn = document.getElementById("toggleConfigBtn");
const configPanel = document.getElementById("configPanel");
const customSheetUrlInput = document.getElementById("customSheetUrl");
const saveUrlBtn = document.getElementById("saveUrlBtn");
const urlStatusBadge = document.getElementById("urlStatusBadge");

// ==============================================================================
// 3. 유효성 검사 (Validation)
// ==============================================================================
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validateForm() {
  let isValid = true;

  // 이름 검증 (2글자 이상)
  const nameVal = nameInput.value.trim();
  if (!nameVal || nameVal.length < 2) {
    showError(nameInput, nameError);
    isValid = false;
  } else {
    clearError(nameInput, nameError);
  }

  // 이메일 검증
  const emailVal = emailInput.value.trim();
  if (!emailVal || !EMAIL_REGEX.test(emailVal)) {
    showError(emailInput, emailError);
    isValid = false;
  } else {
    clearError(emailInput, emailError);
  }

  // 개인정보 수집 및 이용 동의 체크 여부
  if (!privacyCheckbox.checked) {
    privacyError.classList.remove("hidden");
    isValid = false;
  } else {
    privacyError.classList.add("hidden");
  }

  return isValid;
}

function showError(inputEl, errorEl) {
  inputEl.classList.add("border-rose-400", "focus:ring-rose-400");
  inputEl.classList.remove("border-slate-300", "focus:ring-indigo-500");
  errorEl.classList.remove("hidden");
}

function clearError(inputEl, errorEl) {
  inputEl.classList.remove("border-rose-400", "focus:ring-rose-400");
  inputEl.classList.add("border-slate-300", "focus:ring-indigo-500");
  errorEl.classList.add("hidden");
}

// 사용자 입력 시 실시간 에러 제거
nameInput.addEventListener("input", () => {
  if (nameInput.value.trim().length >= 2) clearError(nameInput, nameError);
});

emailInput.addEventListener("input", () => {
  if (EMAIL_REGEX.test(emailInput.value.trim())) clearError(emailInput, emailError);
});

privacyCheckbox.addEventListener("change", () => {
  if (privacyCheckbox.checked) privacyError.classList.add("hidden");
});

// ==============================================================================
// 4. 로딩 UI 상태 제어
// ==============================================================================
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  if (isLoading) {
    btnText.textContent = "신청 정보 등록 중...";
    btnArrow.classList.add("hidden");
    btnSpinner.classList.remove("hidden");
    formErrorMessage.classList.add("hidden");
  } else {
    btnText.textContent = "무료 참가 신청 완료하기";
    btnArrow.classList.remove("hidden");
    btnSpinner.classList.add("hidden");
  }
}

// ==============================================================================
// 5. 폼 제출 및 구글 시트 전송 처리
// ==============================================================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const payload = {
    name: nameInput.value.trim(),
    email: emailInput.value.trim(),
    privacy: privacyCheckbox.checked
  };

  setLoading(true);

  const scriptUrl = getScriptUrl();

  // 구글 앱스 스크립트 URL이 미등록된 경우 (테스트/체험 모드)
  if (!scriptUrl) {
    console.info("ℹ️ [테스트 모드] 구글 웹 앱 URL이 설정되지 않아 시뮬레이션으로 완료 처리합니다.");
    console.info("전송될 데이터:", payload);

    setTimeout(() => {
      setLoading(false);
      handleSuccess(payload.name, payload.email, true);
    }, 800);
    return;
  }

  // 실제 구글 앱스 스크립트로 데이터 전송
  try {
    console.log("📤 [데이터 전송] 컴퓨터 정보가 제외된 신청 데이터:", payload);
    // Google Apps Script는 text/plain으로 JSON을 전달할 때 CORS 사전요청(OPTIONS) 없이 원활히 수신됩니다.
    const response = await fetch(scriptUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      }
    });

    // 200 OK 수신 시
    if (response.ok) {
      handleSuccess(payload.name, payload.email);
    } else {
      throw new Error(`서버 응답 오류 (상태 코드: ${response.status})`);
    }
  } catch (err) {
    console.warn("표준 요청 재시도(no-cors 모드):", err);
    
    // Apps Script의 리디렉션 특성으로 인해 no-cors 폴백 시도
    try {
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        }
      });
      // no-cors는 결과 본문을 읽을 수 없으나 정상 전송됨
      handleSuccess(payload.name, payload.email);
    } catch (fallbackErr) {
      console.error("데이터 전송 실패:", fallbackErr);
      formErrorMessage.textContent = "신청 처리 중 통신 오류가 발생했습니다. 구글 앱스 스크립트 배포 설정을 확인해 주세요.";
      formErrorMessage.classList.remove("hidden");
    }
  } finally {
    setLoading(false);
  }
});

function handleSuccess(name, email, isMock = false) {
  registeredName.textContent = name;
  registeredEmail.textContent = email;
  
  if (isMock) {
    console.log("💡 팁: 실제 구글 스프레드시트에 데이터를 쌓으려면 하단의 '구글 스프레드시트 연동 설정'에 배포된 URL을 넣어주세요.");
  }

  // 폼 초기화
  form.reset();

  // 완료 모달 열기
  openModal(successModal);
}

// ==============================================================================
// 6. 모달 제어
// ==============================================================================
function openModal(modalEl) {
  modalEl.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(modalEl) {
  modalEl.classList.remove("active");
  document.body.style.overflow = "";
}

// 개인정보 모달 이벤트
openPrivacyBtn.addEventListener("click", () => openModal(privacyModal));
closePrivacyBtn.addEventListener("click", () => closeModal(privacyModal));
confirmPrivacyBtn.addEventListener("click", () => {
  privacyCheckbox.checked = true;
  privacyError.classList.add("hidden");
  closeModal(privacyModal);
});

// 완료 모달 이벤트
closeSuccessBtn.addEventListener("click", () => closeModal(successModal));

// 배경 클릭 시 닫기
[privacyModal, successModal].forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal(modal);
    }
  });
});

// ESC 키로 모달 닫기
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal(privacyModal);
    closeModal(successModal);
  }
});

// ==============================================================================
// 7. 스프레드시트 연동 간편 설정 패널
// ==============================================================================
function updateConfigUI() {
  const currentUrl = getScriptUrl();
  const configWrapper = toggleConfigBtn.closest(".border-t");

  // DEFAULT_SCRIPT_URL이 설정되어 있으면 실 서비스 모드로 간주하여 일반 방문자에게는 버튼 숨김
  if (DEFAULT_SCRIPT_URL && configWrapper) {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("admin")) {
      configWrapper.style.display = "none";
    }
  }

  if (currentUrl) {
    customSheetUrlInput.value = currentUrl;
    urlStatusBadge.textContent = "연동됨 (Custom URL)";
    urlStatusBadge.className = "text-[10px] text-emerald-600 font-semibold";
  } else {
    customSheetUrlInput.value = "";
    urlStatusBadge.textContent = "기본 테스트 모드 (URL 미입력)";
    urlStatusBadge.className = "text-[10px] text-amber-600 font-semibold";
  }
}

toggleConfigBtn.addEventListener("click", () => {
  configPanel.classList.toggle("hidden");
});

saveUrlBtn.addEventListener("click", () => {
  const newUrl = customSheetUrlInput.value.trim();
  if (newUrl) {
    localStorage.setItem("webinar_script_url", newUrl);
    alert("구글 웹 앱 URL이 성공적으로 저장되었습니다!");
  } else {
    localStorage.removeItem("webinar_script_url");
    alert("URL이 초기화되어 기본 테스트 모드로 전환되었습니다.");
  }
  updateConfigUI();
});

// 초기화
updateConfigUI();
