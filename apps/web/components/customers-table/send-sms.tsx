// Send SMS Modal
interface SendSMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: { id: string; name: string; phone: string }[];
}

export function SendSMSModal({ isOpen, onClose, customers }: SendSMSModalProps) {
  const [smsData, setSmsData] = useState({
    message: "",
    isFlashMessage: false,
  });
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const maxLength = 600;

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(customers.map(c => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCustomers.length === 0) {
      toast.error("Please select at least one customer");
      return;
    }

    if (!smsData.message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsLoading(true);
    try {
      // API call to send SMS
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`SMS sent to ${selectedCustomers.length} customer(s) successfully`);
      onClose();
      // Reset form
      setSelectedCustomers([]);
      setSmsData({ message: "", isFlashMessage: false });
    } catch (error) {
      toast.error("Failed to send SMS");
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCustomerNames = customers
    .filter(c => selectedCustomers.includes(c.id))
    .map(c => c.name)
    .join(", ");

  const remainingChars = maxLength - smsData.message.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send SMS</DialogTitle>
          <DialogDescription>
            Send an SMS message to selected customers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Customers</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedCustomers.length === customers.length 
                    ? "Deselect All" 
                    : "Select All"}
                </Button>
              </div>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {customers.map((customer) => (
                  <div key={customer.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`customer-${customer.id}`}
                      checked={selectedCustomers.includes(customer.id)}
                      onCheckedChange={() => handleCustomerToggle(customer.id)}
                    />
                    <Label
                      htmlFor={`customer-${customer.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {customer.name} - {customer.phone}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedCustomers.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {selectedCustomerNames}
                </p>
              )}
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message</Label>
                <span className={`text-xs ${
                  remainingChars < 50 ? 'text-orange-500' : 'text-muted-foreground'
                }`}>
                  {remainingChars} characters remaining
                </span>
              </div>
              <Textarea
                id="message"
                value={smsData.message}
                onChange={(e) => {
                  if (e.target.value.length <= maxLength) {
                    setSmsData({ ...smsData, message: e.target.value });
                  }
                }}
                placeholder="Write your SMS message here..."
                rows={5}
                required
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Maximum {maxLength} characters
              </p>
            </div>

            {/* Flash Message Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="flash-message"
                checked={smsData.isFlashMessage}
                onCheckedChange={(checked) =>
                  setSmsData({ ...smsData, isFlashMessage: checked })
                }
              />
              <Label htmlFor="flash-message" className="text-sm cursor-pointer">
                Send as Flash Message
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">
                    Flash messages appear directly on the recipient's screen 
                    without being saved to their inbox
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              {selectedCustomers.length} recipient(s)
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || selectedCustomers.length === 0 || !smsData.message.trim()}
              >
                {isLoading ? (
                  "Sending..."
                ) : (
                  <>
                    <Send className="size-4 mr-2" />
                    Send SMS
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}