import React, { useEffect } from 'react';
// Redirect alias for /eventos/nuevo → PostEventForm
export { default } from '../post-event-form/index.jsx';

const PostEvent = () => {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.warn('Placeholder: PostEvent is not implemented yet.');
  }, []);
  return (
    <div>
      {/* PostEvent placeholder */}
    </div>
  );
};

export default PostEvent;