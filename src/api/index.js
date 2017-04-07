import { version } from '../../package.json';
import { Router } from 'express';
import receipt from './receipt';

export default ({ config, db }) => {
	let api = Router();

	// mount the facets resource
	api.use('/receipt', receipt({ config, db }));

	// perhaps expose some API metadata at the root
	// api.get('/', (req, res) => {
	// 	res.json({ version });
	// });

  return api;
}