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
} from 'app/selectors/xpromo';



let displayTimer;



const T = React.PropTypes;

class XPromoWrapper extends React.Component {
  static propTypes = {
    recordXPromoShown: T.func.isRequired,
  };

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






  displayPersistBannerByTimer() {
    /*
     * CONFIG
     */ 
    const { dispatch } = this.props;
    const config = { 
      duration  : 3, 
      showTime  : 1*5*1000, // 1*60*100,
      hideTime  : 1*10*1000, // 11*60*100,
      period    : 1*20*1000, // 24*60*60*1000,
    };

    /*
     * TIMER
     */ 
    clearTimeout(displayTimer);
    const timer = () => {
      displayTimer = setTimeout(()=>{ 
        checker();
        timer();
      }, 1000);
    };
    timer();

    /*
     * CHECKER
     */ 
    const checker = () => {
      const param = getLocalStorageKey();

      if (!localStorage.getItem('bannerLastClosed')) {
        displayToggle(true);
        return false;
      }

      // если можем показывать баннер
      if (Date.now() <= (param.time + config.showTime)) {
        console.error('> LESS SHOW TIME ->', 'show', param.count);
        displayToggle(true);
      } else {
        displayToggle(false);
        // если количествео показов
        // меньше частоты показа
        if (param.count < config.duration) {
          // проверяем не находимся ли мы в интервале
          // времени когда еще ненадо покзаывать баннер
          if (Date.now() < (param.time + config.hideTime)) {
            console.error('> LESS HIDE TIME ->', 'hide', param.count);
          } else {
            console.error('> OVER HIDE TIME ->', 'change', param.count);
            setLocalStorageKey({ time: Date.now(), count: param.count +=1 });
          }
        } else {
          // есди мы за пределами 3 паказов то следим за тем
          // чтобы текущее время не привысило полный период до
          // следующих 3 показов
          if (Date.now() < (param.time + config.period)) {
            console.error('> LESS PERIOD TIME ->', 'hide', param.count);
          } else {
            console.error('> OVER PERIOD TIME ->', 'change', param.count);
            setLocalStorageKey({ time: Date.now(), count: 1 });
          }
        }
      }
    };

    /*
     * LS CONTROLLER
     */ 
    const key = 'bannerPersistDisplay';
    const getLocalStorageKey = () => {
      const lskey = localStorage.getItem(key);
      if (lskey) {
        return JSON.parse(lskey);
      }
      return setLocalStorageKey({ time: Date.now(), count: 1 });
      
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
    };
  }






  componentDidMount() {
    // Indicate that we've displayed a crosspromotional UI, 
    // so we don't keep showing them during this browsing session.
    this.props.recordXPromoShown();
    this.toggleOnScroll(true);

    if (isXPromoPersistent) {
      this.displayPersistBannerByTimer();
    } else {
      clearTimeout(displayTimer);
    }
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
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  recordXPromoShown: () =>
    dispatchProps.dispatch(xpromoActions.recordShown(stateProps.currentUrl)),
  ...ownProps,
});

export default connect(selector, undefined, mergeProps)(XPromoWrapper);
