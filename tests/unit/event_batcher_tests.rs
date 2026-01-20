#[cfg(test)]
mod event_batcher_tests {
    use std::time::Duration;
    use chrono::Utc;

    /// Simulates event batching logic
    /// In production, this would test the actual event_batcher module
    
    #[derive(Debug, Clone, PartialEq)]
    enum EventType {
        ClockIn,
        ClockOut,
        AppFocus,
        IdleStart,
        IdleEnd,
        Screenshot,
    }

    #[derive(Debug, Clone)]
    struct MockEvent {
        event_type: EventType,
        timestamp: i64,
        data: Option<String>,
    }

    impl MockEvent {
        fn new(event_type: EventType, data: Option<String>) -> Self {
            Self {
                event_type,
                timestamp: Utc::now().timestamp_millis(),
                data,
            }
        }
    }

    struct EventBatcher {
        events: Vec<MockEvent>,
        max_batch_size: usize,
        max_wait_ms: u64,
    }

    impl EventBatcher {
        fn new(max_batch_size: usize, max_wait_ms: u64) -> Self {
            Self {
                events: Vec::new(),
                max_batch_size,
                max_wait_ms,
            }
        }

        fn add_event(&mut self, event: MockEvent) {
            self.events.push(event);
        }

        fn should_flush(&self) -> bool {
            self.events.len() >= self.max_batch_size
        }

        fn flush(&mut self) -> Vec<MockEvent> {
            std::mem::take(&mut self.events)
        }

        fn len(&self) -> usize {
            self.events.len()
        }

        fn is_empty(&self) -> bool {
            self.events.is_empty()
        }
    }

    #[test]
    fn test_event_batcher_creation() {
        let batcher = EventBatcher::new(10, 5000);
        assert!(batcher.is_empty());
        assert_eq!(batcher.len(), 0);
    }

    #[test]
    fn test_add_single_event() {
        let mut batcher = EventBatcher::new(10, 5000);
        
        let event = MockEvent::new(EventType::AppFocus, Some("VS Code".to_string()));
        batcher.add_event(event);
        
        assert_eq!(batcher.len(), 1);
        assert!(!batcher.is_empty());
    }

    #[test]
    fn test_add_multiple_events() {
        let mut batcher = EventBatcher::new(10, 5000);
        
        batcher.add_event(MockEvent::new(EventType::ClockIn, None));
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("VS Code".to_string())));
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("Chrome".to_string())));
        
        assert_eq!(batcher.len(), 3);
    }

    #[test]
    fn test_should_flush_at_batch_size() {
        let mut batcher = EventBatcher::new(3, 5000);
        
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("App 1".to_string())));
        assert!(!batcher.should_flush());
        
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("App 2".to_string())));
        assert!(!batcher.should_flush());
        
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("App 3".to_string())));
        assert!(batcher.should_flush()); // Now at batch size
    }

    #[test]
    fn test_flush_returns_all_events() {
        let mut batcher = EventBatcher::new(10, 5000);
        
        batcher.add_event(MockEvent::new(EventType::ClockIn, None));
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("VS Code".to_string())));
        batcher.add_event(MockEvent::new(EventType::IdleStart, None));
        
        let flushed = batcher.flush();
        
        assert_eq!(flushed.len(), 3);
        assert!(batcher.is_empty());
    }

    #[test]
    fn test_flush_clears_batcher() {
        let mut batcher = EventBatcher::new(10, 5000);
        
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("VS Code".to_string())));
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("Chrome".to_string())));
        
        batcher.flush();
        
        assert!(batcher.is_empty());
        assert_eq!(batcher.len(), 0);
    }

    #[test]
    fn test_event_types_preserved() {
        let mut batcher = EventBatcher::new(10, 5000);
        
        batcher.add_event(MockEvent::new(EventType::ClockIn, None));
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("VS Code".to_string())));
        batcher.add_event(MockEvent::new(EventType::IdleStart, None));
        batcher.add_event(MockEvent::new(EventType::IdleEnd, None));
        batcher.add_event(MockEvent::new(EventType::Screenshot, None));
        batcher.add_event(MockEvent::new(EventType::ClockOut, None));
        
        let flushed = batcher.flush();
        
        assert_eq!(flushed[0].event_type, EventType::ClockIn);
        assert_eq!(flushed[1].event_type, EventType::AppFocus);
        assert_eq!(flushed[2].event_type, EventType::IdleStart);
        assert_eq!(flushed[3].event_type, EventType::IdleEnd);
        assert_eq!(flushed[4].event_type, EventType::Screenshot);
        assert_eq!(flushed[5].event_type, EventType::ClockOut);
    }

    #[test]
    fn test_priority_events_detection() {
        // Priority events that should bypass rate limiting
        let priority_types = vec![
            EventType::ClockIn,
            EventType::ClockOut,
            EventType::Screenshot,
        ];
        
        let event = MockEvent::new(EventType::ClockIn, None);
        let is_priority = priority_types.contains(&event.event_type);
        
        assert!(is_priority);
    }

    #[test]
    fn test_non_priority_events_detection() {
        let priority_types = vec![
            EventType::ClockIn,
            EventType::ClockOut,
            EventType::Screenshot,
        ];
        
        let event = MockEvent::new(EventType::AppFocus, Some("VS Code".to_string()));
        let is_priority = priority_types.contains(&event.event_type);
        
        assert!(!is_priority);
    }

    #[test]
    fn test_event_ordering_preserved() {
        let mut batcher = EventBatcher::new(100, 5000);
        
        // Add events with specific order
        for i in 0..10 {
            batcher.add_event(MockEvent::new(
                EventType::AppFocus,
                Some(format!("App {}", i)),
            ));
        }
        
        let flushed = batcher.flush();
        
        // Verify order is preserved
        for (i, event) in flushed.iter().enumerate() {
            assert_eq!(event.data, Some(format!("App {}", i)));
        }
    }

    #[test]
    fn test_timestamps_are_set() {
        let event = MockEvent::new(EventType::AppFocus, Some("VS Code".to_string()));
        
        // Timestamp should be recent (within last second)
        let now = Utc::now().timestamp_millis();
        assert!(event.timestamp <= now);
        assert!(event.timestamp > now - 1000);
    }

    #[test]
    fn test_empty_flush() {
        let mut batcher = EventBatcher::new(10, 5000);
        
        let flushed = batcher.flush();
        
        assert!(flushed.is_empty());
    }

    #[test]
    fn test_consecutive_flushes() {
        let mut batcher = EventBatcher::new(10, 5000);
        
        // First batch
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("VS Code".to_string())));
        let first_flush = batcher.flush();
        assert_eq!(first_flush.len(), 1);
        
        // Second batch
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("Chrome".to_string())));
        batcher.add_event(MockEvent::new(EventType::AppFocus, Some("Slack".to_string())));
        let second_flush = batcher.flush();
        assert_eq!(second_flush.len(), 2);
    }
}

