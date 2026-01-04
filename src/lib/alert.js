import Swal from "sweetalert2";

const base = {
  confirmButtonText: "ตกลง",
  confirmButtonColor: "#0f172a",
};

export const alertSuccess = (title, text) =>
  Swal.fire({
    ...base,
    icon: "success",
    title,
    text,
  });

export const alertError = (title, text) =>
  Swal.fire({
    ...base,
    icon: "error",
    title,
    text,
  });

export const alertConfirm = async ({
  title,
  text,
  confirmText = "ยืนยัน",
  cancelText = "ยกเลิก",
}) => {
  const result = await Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: "#0f172a",
  });
  return result.isConfirmed;
};
