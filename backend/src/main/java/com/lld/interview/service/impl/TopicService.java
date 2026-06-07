package com.lld.interview.service.impl;

import com.lld.interview.model.Topic;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TopicService {

    @Cacheable("topics")
    public List<Topic> getAllTopics() {
        return List.of(
            // ── Classic OOP ──────────────────────────────────────────────
            Topic.builder().id("parking").name("Parking Lot").category("Classic OOP")
                .difficulty("easy").icon("local_parking")
                .description("Multi-level parking with vehicle types, ticketing, and payment")
                .tags(List.of("Strategy","Observer","Singleton")).build(),

            Topic.builder().id("elevator").name("Elevator System").category("Classic OOP")
                .difficulty("medium").icon("elevator")
                .description("Elevator controller with multiple lifts, floors, and dispatch algorithm")
                .tags(List.of("State","Scheduler","Queue")).build(),

            Topic.builder().id("atm").name("ATM Machine").category("Classic OOP")
                .difficulty("medium").icon("atm")
                .description("ATM with card auth, PIN validation, transactions, and bank connectivity")
                .tags(List.of("State","Command","Chain of Resp")).build(),

            Topic.builder().id("chess").name("Chess Game").category("Classic OOP")
                .difficulty("hard").icon("casino")
                .description("Full chess with pieces, moves, check/checkmate detection, and game history")
                .tags(List.of("Factory","Polymorphism","Command")).build(),

            Topic.builder().id("snakeladder").name("Snake & Ladder").category("Classic OOP")
                .difficulty("easy").icon("sports_esports")
                .description("Board game with dice, players, snakes, ladders, and win detection")
                .tags(List.of("OOP","Factory","Observer")).build(),

            Topic.builder().id("tictactoe").name("Tic Tac Toe").category("Classic OOP")
                .difficulty("easy").icon("grid_3x3")
                .description("Extensible NxN tic-tac-toe with human/AI players and win detection")
                .tags(List.of("Strategy","OOP")).build(),

            // ── Booking Systems ──────────────────────────────────────────
            Topic.builder().id("bookmyshow").name("BookMyShow").category("Booking Systems")
                .difficulty("hard").icon("confirmation_number")
                .description("Movie booking with seat selection, concurrency control, and payment flow")
                .tags(List.of("Concurrency","Locking","OOP")).build(),

            Topic.builder().id("hotel").name("Hotel Booking").category("Booking Systems")
                .difficulty("medium").icon("hotel")
                .description("Room types, reservations, check-in/out, and dynamic pricing strategies")
                .tags(List.of("Strategy","Factory","OOP")).build(),

            // ── Management Systems ────────────────────────────────────────
            Topic.builder().id("library").name("Library Management").category("Management Systems")
                .difficulty("easy").icon("local_library")
                .description("Book catalog, member management, borrowing, fine calculation, and search")
                .tags(List.of("OOP","Observer","Iterator")).build(),

            Topic.builder().id("inventory").name("Inventory System").category("Management Systems")
                .difficulty("medium").icon("inventory")
                .description("Product catalog, stock management, low-stock alerts, and supplier orders")
                .tags(List.of("Observer","Strategy","Factory")).build(),

            Topic.builder().id("lms").name("Learning Mgmt System").category("Management Systems")
                .difficulty("medium").icon("school")
                .description("Courses, students, assignments, grading, and notification system")
                .tags(List.of("Composite","Observer","Strategy")).build(),

            // ── Infra & Utils ─────────────────────────────────────────────
            Topic.builder().id("ratelimiter").name("Rate Limiter").category("Infra & Utils")
                .difficulty("medium").icon("speed")
                .description("Token bucket, leaky bucket, fixed window, sliding window algorithms")
                .tags(List.of("Token Bucket","Sliding Window","Strategy")).build(),

            Topic.builder().id("logger").name("Logger Framework").category("Infra & Utils")
                .difficulty("easy").icon("article")
                .description("Log levels, formatters, appenders (file/console/DB) and filtering pipeline")
                .tags(List.of("Singleton","Chain","Decorator")).build(),

            Topic.builder().id("cache").name("LRU Cache").category("Infra & Utils")
                .difficulty("medium").icon("memory")
                .description("Generic LRU cache with O(1) get/put, eviction policy, and TTL support")
                .tags(List.of("HashMap","DoublyLinkedList","Generics")).build(),

            Topic.builder().id("pubsub").name("Pub/Sub System").category("Infra & Utils")
                .difficulty("hard").icon("wifi_tethering")
                .description("Topic-based messaging with publishers, subscribers, and delivery guarantees")
                .tags(List.of("Observer","Queue","Strategy")).build(),

            Topic.builder().id("workflow").name("Workflow Engine").category("Infra & Utils")
                .difficulty("hard").icon("account_tree")
                .description("DAG-based workflow with tasks, dependencies, retries, and state tracking")
                .tags(List.of("Chain","Command","State")).build(),

            // ── Real World Apps ───────────────────────────────────────────
            Topic.builder().id("fooddelivery").name("Food Delivery").category("Real World Apps")
                .difficulty("hard").icon("delivery_dining")
                .description("Restaurant listing, cart, order flow, driver assignment, and tracking")
                .tags(List.of("Strategy","Observer","Factory")).build(),

            Topic.builder().id("splitwise").name("Splitwise").category("Real World Apps")
                .difficulty("medium").icon("group")
                .description("Expense splitting with multiple strategies, settlement optimization, and balances")
                .tags(List.of("Strategy","OOP","Graph")).build(),

            Topic.builder().id("wallet").name("Digital Wallet").category("Real World Apps")
                .difficulty("hard").icon("account_balance_wallet")
                .description("Wallet with transactions, P2P transfers, refunds, and idempotency")
                .tags(List.of("Command","State","ACID")).build(),

            Topic.builder().id("notification").name("Notification System").category("Real World Apps")
                .difficulty("medium").icon("notifications")
                .description("Multi-channel notifications (email, SMS, push) with templates and routing")
                .tags(List.of("Strategy","Observer","Factory")).build(),

            Topic.builder().id("filesystem").name("File System").category("Real World Apps")
                .difficulty("medium").icon("folder")
                .description("Directory tree with files, folders, permissions, search, and operations")
                .tags(List.of("Composite","Iterator","Visitor")).build(),

            Topic.builder().id("urlshortener").name("URL Shortener (LLD)").category("Real World Apps")
                .difficulty("easy").icon("link")
                .description("Class-level design of URL shortener with encoding strategies and caching")
                .tags(List.of("Factory","Strategy","Singleton")).build()
        );
    }

    public Optional<Topic> findById(String id) {
        return getAllTopics().stream().filter(t -> t.getId().equals(id)).findFirst();
    }

    public List<String> getCategories() {
        return getAllTopics().stream().map(Topic::getCategory).distinct().toList();
    }
}
