import './styles.less';

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import cx from 'lib/classNames';
import { getDevice } from 'lib/getDeviceFromState';
import XPromoWrapper from 'app/components/XPromoWrapper';
import DualPartInterstitialHeader from 'app/components/DualPartInterstitial/Header';
import DualPartInterstitialFooter from 'app/components/DualPartInterstitial/Footer';
import { xpromoDisplayTheme as theme } from 'app/constants';
import {
  logAppStoreNavigation,
  navigateToAppStore,
  promoClicked,
} from 'app/actions/xpromo';
import {
  scrollPastState,
  isXPromoPersistent,
  xpromoTheme,
  visibilityState,
} from 'app/selectors/xpromo';

function getThemeData(xpromoTheme, scrollPast=false) {
  switch (xpromoTheme) {
    case theme.MINIMAL:
      return {
        visitTrigger : 'banner_button',
        displayClass : {
          'xpromoMinimal': true,
          'fadeOut' : scrollPast,
        },
      };
    case theme.PERSIST:
      return {
        visitTrigger : 'persist_banner_button',
        displayClass : {
          'xpromoPersist': true,
          'fadeOut' : scrollPast,
        },
      };
    case theme.USUAL:
    default:
      return {
        visitTrigger : 'interstitial_button',
        displayClass : {},
      };
  }
}

export function DualPartInterstitial(props) {
  const { scrollPast, xpromoTheme, mixin, persistXPromoState, visibilityState } = props;
  const componentClass = 'DualPartInterstitial';
  const themeDisplayClass = getThemeData(xpromoTheme, scrollPast).displayClass;

  if (persistXPromoState) {
    themeDisplayClass.visiblePersist = visibilityState;
  }

  return (
    <XPromoWrapper>
      <div className={ cx(componentClass, themeDisplayClass, mixin) }>
        <div className={ `${componentClass}__content` }>
          <div className={ `${componentClass}__common` }>
            <DualPartInterstitialHeader { ...props } />
            <DualPartInterstitialFooter { ...props } />
          </div>
        </div>
      </div>
    </XPromoWrapper>
  );
}

export const selector = createSelector(
  getDevice,
  scrollPastState,
  isXPromoPersistent,
  xpromoTheme,
  visibilityState,
  (device, scrollPast, persistXPromoState, xpromoTheme, visibilityState) => ({ 
    device, scrollPast, persistXPromoState, xpromoTheme, visibilityState,
  }),
);

const mapDispatchToProps = dispatch => {
  let preventExtraClick = false;

  return {
    navigator: (visitTrigger, url, persistXPromoState) => (async () => {
      // Prevention of additional click events
      // while the Promise dispatch is awaiting
      if (!preventExtraClick) {
        preventExtraClick = true;
        await dispatch(logAppStoreNavigation(visitTrigger));
        dispatch(promoClicked(persistXPromoState));
        dispatch(navigateToAppStore(url));
        preventExtraClick = false;
      }
    }),
  };
};

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { xpromoTheme, persistXPromoState } = stateProps;
  const { navigator: dispatchNavigator } = dispatchProps;
  const visitTrigger = getThemeData(xpromoTheme).visitTrigger;

  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    navigator: url => dispatchNavigator(visitTrigger, url, persistXPromoState),
  };
};

export default connect(selector, mapDispatchToProps, mergeProps)(DualPartInterstitial);
