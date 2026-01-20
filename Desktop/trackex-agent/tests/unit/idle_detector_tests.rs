#[cfg(test)]
mod idle_detector_tests {
    use std::time::{Duration, Instant};

    /// Simulates idle detection logic
    /// In production, this would test the actual idle_detector module
    
    struct IdleDetector {
        threshold_seconds: u64,
        last_activity: Instant,
        is_idle: bool,
        idle_start_time: Option<Instant>,
    }

    impl IdleDetector {
        fn new(threshold_seconds: u64) -> Self {
            Self {
                threshold_seconds,
                last_activity: Instant::now(),
                is_idle: false,
                idle_start_time: None,
            }
        }

        fn record_activity(&mut self) {
            self.last_activity = Instant::now();
            if self.is_idle {
                self.is_idle = false;
                self.idle_start_time = None;
            }
        }

        fn check_idle(&mut self) -> bool {
            let elapsed = self.last_activity.elapsed();
            let was_idle = self.is_idle;
            
            if elapsed >= Duration::from_secs(self.threshold_seconds) {
                if !self.is_idle {
                    self.is_idle = true;
                    self.idle_start_time = Some(self.last_activity + Duration::from_secs(self.threshold_seconds));
                }
            }
            
            // Return true if state changed to idle
            !was_idle && self.is_idle
        }

        fn is_idle(&self) -> bool {
            self.is_idle
        }

        fn seconds_since_last_activity(&self) -> u64 {
            self.last_activity.elapsed().as_secs()
        }

        fn get_idle_duration(&self) -> Option<Duration> {
            self.idle_start_time.map(|start| start.elapsed())
        }
    }

    #[test]
    fn test_detector_creation() {
        let detector = IdleDetector::new(120);
        assert!(!detector.is_idle());
        assert_eq!(detector.seconds_since_last_activity(), 0);
    }

    #[test]
    fn test_default_threshold() {
        let detector = IdleDetector::new(120); // 2 minutes default
        assert_eq!(detector.threshold_seconds, 120);
    }

    #[test]
    fn test_custom_threshold() {
        let detector = IdleDetector::new(300); // 5 minutes
        assert_eq!(detector.threshold_seconds, 300);
    }

    #[test]
    fn test_initial_state_is_not_idle() {
        let detector = IdleDetector::new(120);
        assert!(!detector.is_idle());
    }

    #[test]
    fn test_activity_resets_idle() {
        let mut detector = IdleDetector::new(0); // Immediate idle for testing
        
        // Force idle state
        detector.is_idle = true;
        detector.idle_start_time = Some(Instant::now());
        
        // Record activity
        detector.record_activity();
        
        assert!(!detector.is_idle());
        assert!(detector.idle_start_time.is_none());
    }

    #[test]
    fn test_activity_updates_last_activity_time() {
        let mut detector = IdleDetector::new(120);
        
        // Wait a tiny bit
        std::thread::sleep(Duration::from_millis(10));
        
        let time_before = detector.last_activity;
        detector.record_activity();
        let time_after = detector.last_activity;
        
        assert!(time_after > time_before);
    }

    #[test]
    fn test_seconds_since_activity() {
        let detector = IdleDetector::new(120);
        
        // Should be 0 immediately after creation
        assert!(detector.seconds_since_last_activity() < 1);
    }

    #[test]
    fn test_idle_duration_none_when_active() {
        let detector = IdleDetector::new(120);
        
        assert!(detector.get_idle_duration().is_none());
    }

    #[test]
    fn test_idle_state_transition() {
        let mut detector = IdleDetector::new(0); // 0 seconds for immediate idle
        
        // Manually set last_activity to past
        detector.last_activity = Instant::now() - Duration::from_secs(10);
        
        // Check idle - should transition
        let became_idle = detector.check_idle();
        
        assert!(became_idle);
        assert!(detector.is_idle());
    }

    #[test]
    fn test_no_double_idle_event() {
        let mut detector = IdleDetector::new(0);
        
        // Set to past
        detector.last_activity = Instant::now() - Duration::from_secs(10);
        
        // First check should return true (state change)
        let first_check = detector.check_idle();
        assert!(first_check);
        
        // Second check should return false (no state change)
        let second_check = detector.check_idle();
        assert!(!second_check);
    }

    #[test]
    fn test_idle_then_active_then_idle() {
        let mut detector = IdleDetector::new(0);
        
        // Become idle
        detector.last_activity = Instant::now() - Duration::from_secs(10);
        detector.check_idle();
        assert!(detector.is_idle());
        
        // Become active
        detector.record_activity();
        assert!(!detector.is_idle());
        
        // Become idle again
        detector.last_activity = Instant::now() - Duration::from_secs(10);
        let became_idle = detector.check_idle();
        assert!(became_idle);
        assert!(detector.is_idle());
    }

    #[test]
    fn test_threshold_boundary_not_idle() {
        let mut detector = IdleDetector::new(120);
        
        // Set to just under threshold
        detector.last_activity = Instant::now() - Duration::from_secs(119);
        
        detector.check_idle();
        
        assert!(!detector.is_idle());
    }

    #[test]
    fn test_threshold_boundary_is_idle() {
        let mut detector = IdleDetector::new(120);
        
        // Set to exactly threshold
        detector.last_activity = Instant::now() - Duration::from_secs(120);
        
        detector.check_idle();
        
        assert!(detector.is_idle());
    }

    #[test]
    fn test_threshold_over_is_idle() {
        let mut detector = IdleDetector::new(120);
        
        // Set well over threshold
        detector.last_activity = Instant::now() - Duration::from_secs(300);
        
        detector.check_idle();
        
        assert!(detector.is_idle());
    }

    // Additional edge case tests

    #[test]
    fn test_very_short_threshold() {
        let detector = IdleDetector::new(1); // 1 second
        assert_eq!(detector.threshold_seconds, 1);
    }

    #[test]
    fn test_very_long_threshold() {
        let detector = IdleDetector::new(3600); // 1 hour
        assert_eq!(detector.threshold_seconds, 3600);
    }

    #[test]
    fn test_continuous_activity_prevents_idle() {
        let mut detector = IdleDetector::new(120);
        
        // Simulate continuous activity
        for _ in 0..10 {
            detector.record_activity();
            detector.check_idle();
            assert!(!detector.is_idle());
        }
    }
}

