import { Router } from "express";
import { login, signup, userdata, forgotPassword, getDashboardStats, deleteAUser, updateAUser, profileupdate,
    updateAPassword } from "../controllers/user/user";
import { checkAuth } from "src/middleware/check-auth";
import { uploadProfile } from "src/config/multerConfig";

const router = Router();

router.get("/me", checkAuth, userdata);
router.post("/register", signup)
router.post("/login", login)
router.patch("/forgot-password", forgotPassword)
router.get("/dashboard", checkAuth, getDashboardStats)
router.post("/update-profile-pic", uploadProfile.single("profileImage"), profileupdate);
router.route("/update-profile").patch(checkAuth, updateAUser).delete(checkAuth, deleteAUser)
router.route("/updatedetails").put(checkAuth, updateAUser).delete(checkAuth, deleteAUser)
router.route("/change-password").post(checkAuth, updateAPassword)

export { router }