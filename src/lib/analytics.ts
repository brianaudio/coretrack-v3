// Analytics utility functions for tracking landing page conversions

interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
}

// Track button clicks for conversion analysis
export const trackButtonClick = (buttonLocation: string, buttonText: string) => {
  const event: AnalyticsEvent = {
    event: 'cta_click',
    category: 'Landing Page',
    action: 'Button Click',
    label: `${buttonLocation}: ${buttonText}`
  };

  // Console log for development - replace with actual analytics service
  console.log('Analytics Event:', event);

  // Example integration with Google Analytics 4
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', event.action, {
      event_category: event.category,
      event_label: event.label,
      custom_parameter_1: buttonLocation
    });
  }

  // Example integration with Facebook Pixel
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Lead', {
      content_name: buttonText,
      content_category: buttonLocation
    });
  }

  // Track to localStorage for internal analytics
  try {
    const clickData = {
      timestamp: new Date().toISOString(),
      buttonLocation,
      buttonText,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const existingClicks = JSON.parse(localStorage.getItem('coretrack_clicks') || '[]');
    existingClicks.push(clickData);
    
    // Keep only last 100 clicks to prevent storage bloat
    const recentClicks = existingClicks.slice(-100);
    localStorage.setItem('coretrack_clicks', JSON.stringify(recentClicks));
  } catch (error) {
    console.warn('Failed to store click analytics:', error);
  }
};

// Track page views and time spent
export const trackPageView = () => {
  const event: AnalyticsEvent = {
    event: 'page_view',
    category: 'Landing Page',
    action: 'View'
  };

  console.log('Analytics Event:', event);

  // Track page load time
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      console.log('Page Load Time:', loadTime);
    });
  }
};

// Track form interactions
export const trackFormInteraction = (formName: string, action: string) => {
  const event: AnalyticsEvent = {
    event: 'form_interaction',
    category: 'Lead Generation',
    action,
    label: formName
  };

  console.log('Analytics Event:', event);
};

// Track scroll depth for engagement analysis
export const trackScrollDepth = () => {
  if (typeof window === 'undefined') return;

  let maxScroll = 0;
  const milestones = [25, 50, 75, 90, 100];
  const tracked = new Set<number>();

  const handleScroll = () => {
    const scrollTop = window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !tracked.has(milestone)) {
          tracked.add(milestone);
          console.log(`Scroll Depth: ${milestone}%`);
          
          // Track to analytics
          if ((window as any).gtag) {
            (window as any).gtag('event', 'scroll_depth', {
              event_category: 'Engagement',
              event_label: `${milestone}%`,
              value: milestone
            });
          }
        }
      });
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Cleanup function
  return () => window.removeEventListener('scroll', handleScroll);
};

// Get conversion data for analysis
export const getConversionData = () => {
  try {
    const clicks = JSON.parse(localStorage.getItem('coretrack_clicks') || '[]');
    return {
      totalClicks: clicks.length,
      clicksByLocation: clicks.reduce((acc: any, click: any) => {
        acc[click.buttonLocation] = (acc[click.buttonLocation] || 0) + 1;
        return acc;
      }, {}),
      recentClicks: clicks.slice(-10),
      firstClick: clicks[0],
      lastClick: clicks[clicks.length - 1]
    };
  } catch (error) {
    console.warn('Failed to get conversion data:', error);
    return null;
  }
};
