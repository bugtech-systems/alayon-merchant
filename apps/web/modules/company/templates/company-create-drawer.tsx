import { Button, Drawer } from "@medusajs/ui";
import { useCreateCompany } from "../../../hooks/api";
import { CompanyFormStepper } from "../components/company-form-stepper";

export function CompanyCreateDrawer({open, onOpenChange}) {
  const { mutateAsync, isPending, error } = useCreateCompany();

  const handleSubmit = async (formData: any) => {
    await mutateAsync(formData, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Trigger asChild>
        <Button variant="secondary" size="small">
          Create Company
        </Button>
      </Drawer.Trigger>
      <Drawer.Content className="max-w-[1200px]">
        <Drawer.Header>
          <Drawer.Title>Create New Company</Drawer.Title>
          <Drawer.Description>
            Fill in the company details to get started
          </Drawer.Description>
        </Drawer.Header>
        <CompanyFormStepper
          handleSubmit={handleSubmit}
          loading={isPending}
          error={error}
          onCancel={() => onOpenChange(false)}
        />
      </Drawer.Content>
    </Drawer>
  );
}