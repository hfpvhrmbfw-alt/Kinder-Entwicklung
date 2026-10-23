// swift-tools-version: 5.9
// Kernlogik der iPhone-App: Datenmodelle, Alter, Filter, Empfehlung, Vorsorge, Sicherung.
// Ohne UI, damit sie auch unter Linux baut und mit denselben Testfällen wie die Web-App läuft.
import PackageDescription

let package = Package(
    name: "KleineSchritteCore",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "KleineSchritteCore", targets: ["KleineSchritteCore"]),
    ],
    targets: [
        .target(name: "KleineSchritteCore"),
        .testTarget(name: "KleineSchritteCoreTests", dependencies: ["KleineSchritteCore"]),
    ]
)
