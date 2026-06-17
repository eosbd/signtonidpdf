import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import recordsRouter from "./records";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(recordsRouter);
router.use(settingsRouter);

export default router;
