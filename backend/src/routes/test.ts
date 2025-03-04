import {Router, Request, Response} from 'express';

const router: Router = Router();

router.get('/', (req: Request, res: Response) => {
    const response_object = {
        message: 'This is a test object',
        data: 'And this is data',
        data2: 'And this is data2'
    };

    res.send(response_object);
})

export const TestRouter = router;
