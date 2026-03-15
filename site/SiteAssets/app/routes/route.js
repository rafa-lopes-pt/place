import {
  Text,
  Container,
  defineRoute,
} from '../libs/nofbiz/nofbiz.base.js';

export default defineRoute((config) => {
  config.setRouteTitle('Home');

  return [
    new Text('Welcome', { type: 'h1' }),
    new Container([
      new Text('Your SPARC application is ready. Start building routes.', { type: 'p' }),
    ]),
  ];
});
