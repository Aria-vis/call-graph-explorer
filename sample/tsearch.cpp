#include <bits/stdc++.h>
using namespace std;

struct Trade {
    int id;
    double price;
    int volume;
};

int binarySearch(const vector<Trade>& trades, int low, int high, double targetPrice) {
    if (low > high) {
        return -1;
    }
    
    int mid = low + (high - low) / 2;
    
    if (trades[mid].price == targetPrice) {
        return trades[mid].id;
    }
    
    if (trades[mid].price > targetPrice) {
        return binarySearch(trades, low, mid - 1, targetPrice);
    }
    
    return binarySearch(trades, mid + 1, high, targetPrice);
}

void processData() {
    vector<Trade> dailyTrades = {
        {101, 145.50, 500},
        {102, 148.25, 300},
        {103, 151.00, 800},
        {104, 155.75, 250},
        {105, 160.00, 1000}
    };

    double target = 151.00;
    
    int resultId = binarySearch(dailyTrades, 0, dailyTrades.size() - 1, target);

    if (resultId != -1) {
        cout << "Found trade ID: " << resultId << " at price " << target << "\n";
    } else {
        cout << "Trade not found.\n";
    }
}

int main() {
    processData();
    return 0;
}