import { Express, Request, Response } from 'express';

export const setupRoutes = (app: Express) => {
    app.get('/api/health', (req: Request, res: Response) => {
        res.status(200).send({ message: 'Server is running' });
    });

    // Example endpoint for fetching the game state
    app.get('/api/game-state', (req: Request, res: Response) => {
        res.status(200).json({ players: [], objectives: [], victoryPoints: {} });
    });

    // Example endpoint for updating a player's resources
    app.post('/api/player/update-resources', (req: Request, res: Response) => {
        const { playerId, resources } = req.body;

        res.status(200).send({ message: `Updated resources for player ${playerId}` });
    });
};