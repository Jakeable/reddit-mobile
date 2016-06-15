import merge from '@r/platform/merge';
import { models } from '@r/api-client';
const { COMMENT } = models.ModelTypes;

import mergeAPIModels from './helpers/mergeAPIModels';
import mergeUpdatedModel from './helpers/mergeUpdatedModel';
import * as loginActions from 'app/actions/login';
import * as activitiesActions from 'app/actions/activities';
import * as commentsPageActions from 'app/actions/commentsPage';
import * as postsListActions from 'app/actions/postsList';
import * as hiddenActions from 'app/actions/hidden';
import * as replyActions from 'app/actions/reply';
import * as savedActions from 'app/actions/saved';
import * as searchActions from 'app/actions/search';
import * as voteActions from 'app/actions/vote';

const DEFAULT = {};

export default function(state=DEFAULT, action={}) {
  switch (action.type) {
    case loginActions.LOGGED_IN:
    case loginActions.LOGGED_OUT: {
      return DEFAULT;
    }

    case activitiesActions.RECEIVED_ACTIVITIES:
    case commentsPageActions.RECEIVED_COMMENTS_PAGE:
    case postsListActions.RECEIVED_POSTS_LIST:
    case hiddenActions.RECEIVED_HIDDEN:
    case savedActions.RECEIVED_SAVED:
    case searchActions.RECEIVED_SEARCH_REQUEST: {
      const { comments } = action.apiResponse;
      return mergeAPIModels(state, comments);
    }

    case replyActions.REPLIED: {
      const { model } = action;
      const parentComment = state[model.parentId];
      if (!parentComment) {
        // If the comment doesn't have a parent, it's in reply to a post.
        // Just merge it into state
        return mergeUpdatedModel(state, action);
      }

      // If the comment is in reply to another comment, we need to update
      // that comment to include the reply

      const updatedParent = parentComment.set({
        replies: [ model.toRecord(), ...parentComment.replies]
      });

      return merge(state, {
        [model.uuid]: model,
        [updatedParent.uuid]: updatedParent,
      });
    }

    case voteActions.VOTED: {
      return mergeUpdatedModel(state, action, { restrictType: COMMENT });
    }

    default: return state;
  }
}