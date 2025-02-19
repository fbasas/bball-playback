import {Router, Request, Response} from 'express';

const router: Router = Router();

router.get('/', (req: Request, res: Response) => {
    res.send({
        message: 'This is a test json'
    });
})

export const TestRouter = router;
