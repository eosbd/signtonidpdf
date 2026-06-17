import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import recordsRouter from "./records";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(recordsRouter);

export default router;
