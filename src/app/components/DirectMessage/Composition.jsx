import './Composition.less';
import React from 'react';

import { JSForm } from 'platform/components';
const T = React.PropTypes;

export default function DirectMessageComposition(props) {
  return (
    <JSForm
      className='DirectMessageComposition'
      onSubmit={ props.onSubmit }
    >
      <input
        className='DirectMessageComposition__input'
        name='to'
        placeholder='Who do you want to message?'
        defaultValue={ props.recipient }
      />
      <input
        className='DirectMessageComposition__input'
        type='disabled'
        readOnly
        value={ `From: ${ props.username }` }
      />
      <input
        className='DirectMessageComposition__input'
        name='subject'
        placeholder='Subject'
      />
      <textarea
        className='DirectMessageComposition__textarea'
        name='body'
        rows='5'
        placeholder='Message'
      />
      <button
        className='DirectMessageComposition__submit'
        type='submit'
      >
        SEND MESSAGE
      </button>
    </JSForm>
  );
}

DirectMessageComposition.propTypes = {
  username: T.string.isRequired,
  recipient: T.string,
};

DirectMessageComposition.defaultProps = {
  recipient: '',
};
