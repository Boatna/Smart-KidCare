document.addEventListener("DOMContentLoaded", () => {
  // หน้านี้ต้อง Login เท่านั้น (Backend ใช้รหัสพนักงานจาก token)
  if (!Auth.requireAuth("login.html")) return;

  Utils.setupNavbar();

  const contactForm = document.getElementById("contactForm");
  const empIdInput = document.getElementById("empId");
  const nameInput = document.getElementById("empName");
  const topicInput = document.getElementById("topic");
  const detailInput = document.getElementById("detail");
  const btnSubmit = document.getElementById("btnSubmitContact");

  const currentUser = Auth.getUser();
  if (currentUser) {
    if (empIdInput) {
      empIdInput.value = currentUser.employeeId;
      empIdInput.readOnly = true;
    }
    if (nameInput) nameInput.value = currentUser.name;
  }

  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const employeeId = (empIdInput ? empIdInput.value : "").trim();
      const name = (nameInput ? nameInput.value : "").trim();
      const topic = (topicInput ? topicInput.value : "").trim();
      const detail = (detailInput ? detailInput.value : "").trim();
      if (!employeeId) {
        Utils.showToast("กรุณากรอกรหัสพนักงาน (Employee ID)", "warning");
        if (empIdInput) empIdInput.focus();
        return;
      }

      if (!topic) {
        Utils.showToast("กรุณาเลือกหรือระบุหัวข้อที่ต้องการติดต่อ", "warning");
        if (topicInput) topicInput.focus();
        return;
      }

      if (!detail) {
        Utils.showToast("กรุณากรอกรายละเอียดปัญหาหรือข้อสอบถาม", "warning");
        if (detailInput) detailInput.focus();
        return;
      }

      const originalBtnText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<span class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span> กำลังส่งข้อมูล...`;

      try {
        const payload = {
          employeeId,
          name: name || "พนักงาน",
          topic,
          detail
        };

        const response = await API.post("submitContact", payload);

        if (response && response.success) {
          Utils.showToast(response.message || "ส่งเรื่องติดต่อ/แจ้งปัญหาสำเร็จเรียบร้อยแล้ว", "success");
          
          // Reset form (keep employeeId/name if logged in)
          if (topicInput) topicInput.value = "";
          if (detailInput) detailInput.value = "";
          if (!currentUser) {
            if (empIdInput) empIdInput.value = "";
            if (nameInput) nameInput.value = "";
          }
        } else {
          Utils.showToast(response.message || "เกิดข้อผิดพลาดในการส่งข้อมูล", "danger");
        }
      } catch (err) {
        Utils.showToast("เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย", "danger");
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalBtnText;
      }
    });
  }
});