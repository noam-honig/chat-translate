declare var gtag;
export function analytics(category:string, action: string) {
  gtag('event', action, {
    'event_category': category,
    'event_label': action
  });


}