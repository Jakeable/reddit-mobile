import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';

import * as xpromoActions from 'app/actions/xpromo';
import { XPROMO_SCROLLPAST, XPROMO_SCROLLUP } from 'lib/eventUtils';
import { 
  xpromoThemeIsUsual,
  scrollPastState,
  scrollStartState,
  isXPromoPersistent,
  dismissedState,
} from 'app/selectors/xpromo';



let displayTimer;

const config = { 
  showTime  : 1*10*1000,
  hideTime  : 1*20*1000,
};

console.error('=================');
console.error('SHOW TIME:', `${config.showTime/1000}s`);
console.error('HIDE TIME:', `${(config.hideTime - config.showTime)/1000}s`);
console.error('=================');

const T = React.PropTypes;

class XPromoWrapper extends React.Component {
  static propTypes = {
    recordXPromoShown: T.func.isRequired,
  };

  displayPersistBannerByTimer() {
    /*
     * CONFIG
     */ 
    const { dispatch } = this.props;

    /*
     * LS CONTROLLER
     */ 
    const key = 'bannerPersistDisplay';
    const getLocalStorageKey = () => {
      const lskey = localStorage.getItem(key);
      return lskey ? JSON.parse(lskey) : setLocalStorageKey({ time: Date.now() });
    };
    const setLocalStorageKey = (val) => {
      const lsVal = JSON.stringify(val);
      localStorage.setItem(key, lsVal);
      return val;
    };

    /*
     * DISPLAY CONTROLLER
     */
    const displayToggle = (state) => {
      dispatch(xpromoActions[state? 'promoShowOnly' : 'promoHideOnly']());
      return state;
    };

    /*
     * CHECKER
     */ 
    const checker = () => {

      // Check if banner was NOT dismissed? 
      // @TODO use constant instead...
      if (!localStorage.getItem('bannerLastClosed')) {
        return displayToggle(true);
      }

      const param = getLocalStorageKey();

      // Can we show the banner?
      if (Date.now() <= (param.time + config.showTime)) {
        console.error('> LESS SHOW TIME ->', 'show');
        return displayToggle(true);
      } else 

      // If more then HIDE time 
      // and the session is new -> show the banner.
      if ((Date.now() > (param.time + config.hideTime)) && !this.props.dismissedState) {
        setLocalStorageKey({ time: Date.now() });
        dispatch(xpromoActions.promoDismissedOnly());
        console.error('> OVER HIDE TIME && NEW SESSION ->', 'change to show');
        return displayToggle(true);
      } 

      // For other cases we dont 
      // need to show up the bunner
      
      displayToggle(false);
      console.error('> HIDE AND STOP TIMER ->', 'hide');
      
    };

    /*
     * TIMER
     */ 
    clearTimeout(displayTimer);
    const timer = () => {
      if (checker()) {
        displayTimer = setTimeout(timer, 1000);
      } else {
        clearTimeout(displayTimer);
      }
    };
    timer.call(this);

  }






  onScroll = () => {
    // For now we will consider scrolling half the 
    // viewport "scrolling past" the interstitial.
    // note the referencing of window
    const { 
      dispatch, 
      alreadyScrolledStart, 
      alreadyScrolledPast, 
      xpromoThemeIsUsual, 
    } = this.props;

    // should appears only once on the start
    // of the scrolled down by the viewport
    if (!xpromoThemeIsUsual && !alreadyScrolledStart) {
      dispatch(xpromoActions.trackXPromoEvent(XPROMO_SCROLLPAST, { scroll_note: 'scroll_start' }));
      dispatch(xpromoActions.promoScrollStart());
    }
    // should appears only once on scroll down about the half viewport.
    // "scrollPast" state is also used for
    // toggling xpromo fade-in/fade-out actions
    if (this.isScrollPast() && !alreadyScrolledPast) {
      const additionalData = (xpromoThemeIsUsual ? {} : { scroll_note: 'unit_fade_out' });
      dispatch(xpromoActions.trackXPromoEvent(XPROMO_SCROLLPAST, additionalData));
      dispatch(xpromoActions.promoScrollPast());
    }
    // should appears only once on scroll up about the half viewport.
    // xpromo fade-in action, if user will scroll
    // window up (only for "minimal" xpromo theme)
    if (!this.isScrollPast() && alreadyScrolledPast) {
      const additionalData = (xpromoThemeIsUsual ? {} : { scroll_note: 'unit_fade_in' });
      dispatch(xpromoActions.trackXPromoEvent(XPROMO_SCROLLUP, additionalData));
      dispatch(xpromoActions.promoScrollUp());
    }
    // remove scroll events for usual xpromo theme 
    // (no needs to listen window up scrolling)
    if (xpromoThemeIsUsual && alreadyScrolledPast && !isXPromoPersistent) {
      this.toggleOnScroll(false);
    }
  }

  isScrollPast() {
    const { alreadyScrolledPast } = this.props;
    let isPastHalfViewport = (window.pageYOffset > window.innerHeight / 2);
    // Fixing an issue, when (height of content part + height of the second xpromo 
    // for bottom padding) is the same as window.pageYOffset. In this case:
    // 1. isPastHalfViewport - is false
    // 2. let's scroll a little bit more
    // 3.1. isPastHalfViewport - become true
    // 3.2. class 'fadeOut' will be deleted 
    // 3.3. second xpromo for bottom padding become hidden (after deleting the class 'fadeOut')
    // 4. window.pageYOffset will become lower again (because of removing height of second xpromo)
    // 5. isPastHalfViewport - will become false 
    // 6. and it will goes around forever...
    // Desynchronizing Up/Down heights, to avoid this issue.
    if (!alreadyScrolledPast) {
      isPastHalfViewport = ((window.pageYOffset - window.innerHeight) > 0);
    }
    return isPastHalfViewport;
  }

  toggleOnScroll(state) {
    if (state) {
      window.addEventListener('scroll', this.onScroll);
    } else {
      window.removeEventListener('scroll', this.onScroll);
    }
  }







  componentWillMount() {
    if (isXPromoPersistent) {
      this.displayPersistBannerByTimer();
    } else {
      clearTimeout(displayTimer);
    }
  }

  componentDidMount() {
    // Indicate that we've displayed a crosspromotional UI, 
    // so we don't keep showing them during this browsing session.
    this.props.recordXPromoShown();
    this.toggleOnScroll(true);
  }

  componentWillUnmount() {
    this.toggleOnScroll(false);
  }

  render() {
    return this.props.children;
  }
}

const selector = createStructuredSelector({
  currentUrl: state => state.platform.currentPage.url,
  alreadyScrolledStart: state => scrollStartState(state),
  alreadyScrolledPast: state => scrollPastState(state),
  xpromoThemeIsUsual: state => xpromoThemeIsUsual(state),
  dismissedState: state => dismissedState(state),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  recordXPromoShown: () =>
    dispatchProps.dispatch(xpromoActions.recordShown(stateProps.currentUrl)),
  ...ownProps,
});

export default connect(selector, undefined, mergeProps)(XPromoWrapper);
