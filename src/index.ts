import { Matrix3Node } from './core/node';
import { Logger } from './core/logger';
import config from '../config/default';

const logger = new Logger(config.logging);

async function main() {
    try {
        logger.info('Starting Matrix3 node...');
        
        const node = new Matrix3Node(config);
        
        // Handle process termination
        process.on('SIGINT', async () => {
            logger.info('Received SIGINT signal, shutting down...');
            await node.stop();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            logger.info('Received SIGTERM signal, shutting down...');
            await node.stop();
            process.exit(0);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled promise rejection:', reason);
            process.exit(1);
        });

        // Initialize and start the node
        await node.initialize();
        await node.start();

        logger.info('Matrix3 node started successfully');
    } catch (error) {
        logger.error('Failed to start Matrix3 node:', error);
        process.exit(1);
    }
}

// Start the application
main(); 